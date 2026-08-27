# Production image for the Next.js app.
#
# Multi-stage so the final image carries only the built output and its
# runtime dependencies — no source, no toolchain, no dev packages. The
# result is ~200MB instead of well over a gigabyte, which matters on a
# small VPS where every rebuild and rollback moves that image around.
#
# Requires `output: "standalone"` in next.config.ts (see the comment there).

# ---------------------------------------------------------------------------
# 1. deps — install node_modules separately so this layer is cached and only
#    reruns when the lockfile actually changes, not on every source edit.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app

RUN corepack enable

# pnpm-workspace.yaml carries the allowBuilds list (sharp and friends need
# their build scripts to run, or Next.js image optimization fails at
# runtime), so it has to be present before install, not just at build time.
COPY package.json pnpm-lock.yaml* package-lock.json* pnpm-workspace.yaml* ./

# Whichever lockfile is present wins, so this works before and after a
# switch between pnpm and npm. --frozen-lockfile / npm ci both refuse to
# silently update the lockfile, which is what you want in a build.
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

# ---------------------------------------------------------------------------
# 2. builder — compile the app.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The build runs pages that call into the data layer. DATA_SOURCE=postgres
# would make it try to reach a database that is not running during `docker
# build`, so the build uses the mock source and the real value is supplied
# at runtime instead. Pages that read the database are rendered on demand
# anyway (they show as `ƒ` in the build output).
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATA_SOURCE=mock

RUN if [ -f pnpm-lock.yaml ]; then pnpm build; else npm run build; fi

# ---------------------------------------------------------------------------
# 3. runner — the image that actually ships.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as a non-root user: a container escape from a root process is far
# more damaging than from an unprivileged one.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# standalone/ carries its own minimal node_modules; static/ and public/ are
# not included in it and have to be copied alongside.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Migrations and the operational scripts, so schema changes and password
# resets can be run inside the running container rather than needing a
# second copy of the repo on the server.
#
# The pg-import-* scripts are deliberately NOT usable here: they depend on
# @supabase/supabase-js, which is a build-time dependency only. Existing
# content reaches the server as a database dump (deploy/backup.sh ->
# deploy/restore.sh), not by re-running the one-time Supabase import — that
# also keeps the service-role key off the server entirely.
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/supabase/migrations ./supabase/migrations
COPY --from=builder --chown=nextjs:nodejs /app/postgres/init ./postgres/init

# `pg` for the migration and password scripts. Nothing in the server build
# imports it at module scope, so it is absent from the standalone bundle.
#
# Installed into its own directory rather than /app/node_modules: npm
# cannot reconcile the pnpm-shaped tree that standalone ships (it crashes
# on the symlinks with "Cannot read properties of null"). NODE_PATH puts it
# on the resolution path without npm ever touching the bundle.
RUN mkdir -p /opt/scripts-deps \
    && cd /opt/scripts-deps \
    && npm init -y >/dev/null 2>&1 \
    && npm install --no-audit --no-fund pg@8 >/dev/null 2>&1 \
    && chown -R nextjs:nodejs /opt/scripts-deps

ENV NODE_PATH=/opt/scripts-deps/node_modules

# Uploads live here. Declared so the directory exists and is writable even
# before the host volume is mounted over it.
RUN mkdir -p /data/media && chown -R nextjs:nodejs /data

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
