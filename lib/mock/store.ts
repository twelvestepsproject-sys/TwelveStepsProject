import fs from "node:fs";
import path from "node:path";
import type {
  Page,
  Post,
  Category,
  Training,
  Lecturer,
  Testimonial,
  ProgramStage,
  ProgramStep,
  ScheduleEntry,
  Gallery,
  PodcastEpisode,
  Media,
  SiteSettings,
  MenuItem,
  MenuLocation,
  Lead,
  NewsletterSubscriber,
  ContactMessage,
  Redirect,
  Profile,
  SharedBlock,
} from "@/lib/schemas";

import { pages } from "@/lib/mock/fixtures/pages";
import { posts } from "@/lib/mock/fixtures/posts";
import { categories } from "@/lib/mock/fixtures/categories";
import { trainings } from "@/lib/mock/fixtures/trainings";
import { lecturers } from "@/lib/mock/fixtures/lecturers";
import { testimonials } from "@/lib/mock/fixtures/testimonials";
import { programStages } from "@/lib/mock/fixtures/program-stages";
import { programSteps } from "@/lib/mock/fixtures/program-steps";
import { scheduleEntries } from "@/lib/mock/fixtures/schedule";
import { podcastEpisodes } from "@/lib/mock/fixtures/podcast";
import { media } from "@/lib/mock/fixtures/media";
import { siteSettings } from "@/lib/mock/fixtures/site-settings";
import { menusByLocation } from "@/lib/mock/fixtures/menus";
import { galleries } from "@/lib/mock/fixtures/galleries";
import { leads as leadsFixture } from "@/lib/mock/fixtures/leads";
import { contactMessages as contactMessagesFixture } from "@/lib/mock/fixtures/contact-messages";
import { newsletterSubscribers as newsletterSubscribersFixture } from "@/lib/mock/fixtures/newsletter-subscribers";
import { redirects as redirectsFixture } from "@/lib/mock/fixtures/redirects";
import { profiles as profilesFixture } from "@/lib/mock/fixtures/profiles";

/**
 * lib/mock/store.ts — §5.5 "Mock writes (Phase 4)".
 *
 * An in-memory store SEEDED from the fixtures (never mutates the fixture
 * arrays directly — everything below is deep-cloned on init), persisted to
 * `.mock-db.json` in the project root (gitignored) so CMS edits survive a
 * dev-server restart. `pnpm mock:reset` deletes that file.
 *
 * This module is intentionally the ONLY place that touches fixtures
 * directly. `lib/queries/mock/index.ts` (the `DataSource` implementation)
 * imports the store, never the fixtures.
 *
 * Node module caching gives us a de-facto singleton across imports within
 * one server process — good enough for local dev. A real multi-process
 * deployment would need a real DB, which is exactly what Phase 5 replaces
 * this with.
 */

export interface Galleries {
  galleries: Gallery[];
}

export interface MockDb {
  pages: Page[];
  /** Shared blocks (migration 24) — content rendered on several pages. */
  sharedBlocks: SharedBlock[];
  posts: Post[];
  categories: Category[];
  trainings: Training[];
  lecturers: Lecturer[];
  testimonials: Testimonial[];
  programStages: ProgramStage[];
  // programSteps are persisted independently so admin CRUD on a single step
  // doesn't require rewriting the whole nested stage; programStages'
  // `.steps` is re-derived from this array on every load (see reindex()).
  programSteps: ProgramStep[];
  scheduleEntries: ScheduleEntry[];
  galleries: Gallery[];
  podcastEpisodes: PodcastEpisode[];
  media: Media[];
  siteSettings: SiteSettings;
  menus: Record<MenuLocation, MenuItem[]>;
  leads: Lead[];
  newsletterSubscribers: NewsletterSubscriber[];
  contactMessages: ContactMessage[];
  redirects: Redirect[];
  profiles: Profile[];
}

const DB_FILE = path.join(process.cwd(), ".mock-db.json");

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Rebuild each stage's nested `.steps` from the flat `programSteps` array,
 * sorted by sort_order — mirrors the future SQL join (§5.5 rule 6). Keeps
 * stages and steps as two independently-writable collections without ever
 * letting them drift out of sync in what callers read. */
function reindexProgramStages(db: MockDb): void {
  const byStage = new Map<string, ProgramStep[]>();
  for (const step of db.programSteps) {
    const arr = byStage.get(step.stage_id) ?? [];
    arr.push(step);
    byStage.set(step.stage_id, arr);
  }
  for (const stage of db.programStages) {
    stage.steps = (byStage.get(stage.id) ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);
  }
}

function seed(): MockDb {
  const db: MockDb = {
    pages: clone(pages),
    // No shared-block fixtures: the feature is editor-created content, and
    // an empty list is the honest starting state.
    sharedBlocks: [],
    posts: clone(posts),
    categories: clone(categories),
    trainings: clone(trainings),
    lecturers: clone(lecturers),
    testimonials: clone(testimonials),
    // programStages fixture already nests `.steps` by filtering
    // programSteps at import time; store both independently and re-derive
    // stage.steps below so writes to either stay consistent.
    programStages: clone(programStages),
    programSteps: clone(programSteps),
    scheduleEntries: clone(scheduleEntries),
    galleries: clone(galleries),
    podcastEpisodes: clone(podcastEpisodes),
    media: clone(media),
    siteSettings: clone(siteSettings),
    menus: clone(menusByLocation),
    // Captured-data tables (leads/messages/subscribers) start genuinely
    // empty in a real deployment — only ever populated by public-facing
    // Server Actions. This task adds a small fictional seed set (task
    // brief: "so the screen isn't empty when demoed") rather than leaving
    // these `[]`, per the earlier pass's own note that they were empty by
    // design at the time (no admin screen existed yet to view them).
    leads: clone(leadsFixture),
    newsletterSubscribers: clone(newsletterSubscribersFixture),
    contactMessages: clone(contactMessagesFixture),
    redirects: clone(redirectsFixture),
    profiles: clone(profilesFixture),
  };
  reindexProgramStages(db);
  return db;
}

function load(): MockDb {
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw) as MockDb;
      reindexProgramStages(parsed);
      return parsed;
    } catch (err) {
      console.warn(
        `[mock-store] failed to read/parse ${DB_FILE}, reseeding from fixtures:`,
        err,
      );
    }
  }
  return seed();
}

// Module-level singleton (per server process) — see file header comment.
const globalForMockDb = globalThis as unknown as { __mockDb?: MockDb };
export const mockDb: MockDb = globalForMockDb.__mockDb ?? load();
if (process.env.NODE_ENV !== "production") {
  globalForMockDb.__mockDb = mockDb;
}

let writeQueued = false;
/** Debounced persistence — writes are batched onto a microtask so several
 * field updates in one Server Action don't each trigger a separate disk
 * write. */
export function persist(): void {
  if (writeQueued) return;
  writeQueued = true;
  queueMicrotask(() => {
    writeQueued = false;
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(mockDb, null, 2), "utf-8");
    } catch (err) {
      console.error(`[mock-store] failed to persist ${DB_FILE}:`, err);
    }
  });
}

export { reindexProgramStages };
