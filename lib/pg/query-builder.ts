import "server-only";
import { query } from "./client";
import { hasColumn } from "./introspect";

/**
 * A minimal PostgREST-shaped query builder over plain SQL.
 *
 * The Supabase DataSource is 1,571 lines of `.from().select().eq()` chains.
 * Rewriting each of its 74 methods as hand-written SQL would mean 74
 * chances to change behaviour by accident, in the one layer standing
 * between the site and its data.
 *
 * Instead this reproduces the slice of the PostgREST surface this project
 * actually uses — measured from the call sites, not guessed: from / select /
 * eq / neq / in / or / order / range / limit / lte / gte / ilike,
 * single / maybeSingle, insert / update / delete, and `{ count: "exact" }`.
 * The DataSource is then reused almost verbatim.
 *
 * Deliberately NOT a general PostgREST implementation: anything outside
 * that set throws, so an unsupported query fails loudly at the call site
 * rather than silently returning the wrong rows.
 */

type Row = Record<string, unknown>;

interface Embed {
  /** Property name on the parent row, e.g. `category` or `images`. */
  alias: string;
  table: string;
  /** Column on the child table pointing at the parent. */
  foreignKey: string;
  /** Column on the parent the child points at (almost always `id`). */
  parentKey: string;
  /** One row (belongs-to) or many (has-many). */
  many: boolean;
  columns: string;
  /** A nested embed, e.g. training_instructors -> lecturer. */
  child?: Embed;
}

interface Filter {
  sql: string;
  values: unknown[];
}

interface Result<T> {
  data: T[] | T | null;
  error: null | { message: string; code?: string };
  count?: number;
}

/** Splits on top-level commas only — commas inside parentheses belong to
 * the embed's own column list. */
function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of input) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/**
 * Parses the three embedded selects this project uses:
 *   "*, category:categories(*)"                                belongs-to
 *   "*, images:gallery_images(*)"                              has-many
 *   "*, training_instructors(sort_order, lecturer:lecturers(*))"  has-many + nested
 *
 * Direction is decided by the alias: an aliased embed whose alias differs
 * from its table (`category:categories`) is a belongs-to via
 * `<alias>_id` on this table; otherwise it is a has-many keyed by
 * `<singular parent>_id` on the child. That covers this schema's naming
 * without needing to read Postgres metadata at query time.
 */
async function parseSelect(
  select: string,
  table: string,
): Promise<{ columns: string; embeds: Embed[] }> {
  if (!select.includes("(")) {
    return { columns: select || "*", embeds: [] };
  }

  const embeds: Embed[] = [];
  const plain: string[] = [];

  for (const part of splitTopLevel(select)) {
    const open = part.indexOf("(");
    if (open === -1) {
      plain.push(part.trim());
      continue;
    }

    const head = part.slice(0, open).trim();
    const inner = part.slice(open + 1, part.lastIndexOf(")")).trim();
    const [aliasOrTable, maybeTable] = head.split(":").map((s) => s.trim());
    const alias = aliasOrTable;
    const childTable = maybeTable ?? aliasOrTable;
    // Ask Postgres rather than infer: posts.category_id exists (belongs-to)
    // while galleries.images_id does not (has-many). The alias looks the
    // same in both cases.
    const isBelongsTo = await hasColumn(table, `${alias}_id`);

    // Order matters: "galleries" must become "gallery", not "gallerie".
    // The ies-rule already consumed the trailing s, so only strip one when
    // it did not apply.
    const singularParent = /ies$/.test(table)
      ? table.replace(/ies$/, "y")
      : table.replace(/s$/, "");

    const embed: Embed = isBelongsTo
      ? {
          alias,
          table: childTable,
          foreignKey: "id",
          parentKey: `${alias}_id`,
          many: false,
          columns: inner,
        }
      : {
          alias,
          table: childTable,
          foreignKey: `${singularParent}_id`,
          parentKey: "id",
          many: true,
          columns: inner,
        };

    // One level of nesting is supported: training_instructors carries its
    // own `lecturer:lecturers(*)`.
    if (inner.includes("(")) {
      const nested = await parseSelect(inner, childTable);
      embed.columns = nested.columns;
      embed.child = nested.embeds[0];
    }

    embeds.push(embed);
  }

  return { columns: plain.length ? plain.join(", ") : "*", embeds };
}

/** jsonb columns need an explicit string; node-postgres would otherwise
 * send a JS array as a Postgres array literal, which jsonb rejects. */
function serialise(value: unknown): unknown {
  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    return JSON.stringify(value);
  }
  return value;
}

export class PgQuery<T = Row> implements PromiseLike<Result<T>> {
  private table: string;
  private selectStr = "*";
  private rawSelect = "*";
  private embeds: Embed[] = [];
  private filters: Filter[] = [];
  private orderParts: string[] = [];
  private limitValue?: number;
  private offsetValue?: number;
  private wantCount = false;
  private mode: "select" | "insert" | "update" | "delete" = "select";
  private payload: Row | Row[] | null = null;
  private singleMode: "none" | "single" | "maybe" = "none";

  constructor(table: string) {
    this.table = table;
  }

  select(select = "*", opts?: { count?: "exact"; head?: boolean }): this {
    // Only recorded here. Parsing needs the schema (see parseSelect), so it
    // is deferred to run(), which can await — the chain itself stays sync,
    // exactly like the Supabase client it stands in for.
    // On a write, `.select()` means "return the affected rows", which the
    // INSERT/UPDATE paths already do via RETURNING.
    if (this.mode === "select") this.rawSelect = select;
    if (opts?.count === "exact") this.wantCount = true;
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ sql: `"${column}" = $$`, values: [value] });
    return this;
  }

  neq(column: string, value: unknown): this {
    this.filters.push({ sql: `"${column}" <> $$`, values: [value] });
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.filters.push({ sql: `"${column}" = any($$)`, values: [values] });
    return this;
  }

  lte(column: string, value: unknown): this {
    this.filters.push({ sql: `"${column}" <= $$`, values: [value] });
    return this;
  }

  gte(column: string, value: unknown): this {
    this.filters.push({ sql: `"${column}" >= $$`, values: [value] });
    return this;
  }

  /**
   * PostgREST's `textSearch`, used by site search against the generated
   * `search_vector` columns. "websearch" maps to websearch_to_tsquery,
   * which tolerates whatever a visitor types instead of erroring on
   * unbalanced quotes the way to_tsquery does.
   */
  textSearch(column: string, q: string, opts?: { type?: string; config?: string }): this {
    const config = opts?.config ?? "simple";
    const fn = opts?.type === "websearch" ? "websearch_to_tsquery" : "plainto_tsquery";
    this.filters.push({
      sql: `"${column}" @@ ${fn}('${config}', $$)`,
      values: [q],
    });
    return this;
  }

  /**
   * PostgREST's `not(column, operator, value)`. This codebase only uses
   * `not(col, "is", null)` to exclude unpublished rows; other operators
   * throw rather than silently matching everything, which on a
   * published-date filter would leak drafts.
   */
  not(column: string, operator: string, value: unknown): this {
    if (operator === "is" && value === null) {
      this.filters.push({ sql: `"${column}" is not null`, values: [] });
      return this;
    }
    if (operator === "eq") {
      this.filters.push({ sql: `"${column}" <> $$`, values: [value] });
      return this;
    }
    throw new Error(`[pg] unsupported not() operator: ${operator}`);
  }

  ilike(column: string, pattern: string): this {
    this.filters.push({ sql: `"${column}" ilike $$`, values: [pattern] });
    return this;
  }

  /**
   * PostgREST's `or("a.ilike.%x%,b.ilike.%x%")`. Only the operators this
   * codebase uses are accepted; an unknown one throws rather than being
   * dropped, which would widen a query instead of narrowing it.
   */
  or(expression: string): this {
    const clauses: string[] = [];
    const values: unknown[] = [];
    for (const raw of splitTopLevel(expression)) {
      const [column, op, ...rest] = raw.split(".");
      const value = rest.join(".");
      if (op === "ilike") {
        clauses.push(`"${column}" ilike $$`);
        values.push(value);
      } else if (op === "eq") {
        clauses.push(`"${column}" = $$`);
        values.push(value);
      } else if (op === "is" && value === "null") {
        clauses.push(`"${column}" is null`);
      } else {
        throw new Error(`[pg] unsupported or() operator: ${op}`);
      }
    }
    this.filters.push({ sql: `(${clauses.join(" or ")})`, values });
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }): this {
    this.orderParts.push(`"${column}" ${opts?.ascending === false ? "desc" : "asc"}`);
    return this;
  }

  limit(n: number): this {
    this.limitValue = n;
    return this;
  }

  range(from: number, to: number): this {
    this.offsetValue = from;
    this.limitValue = to - from + 1;
    return this;
  }

  single(): this {
    this.singleMode = "single";
    return this;
  }

  maybeSingle(): this {
    this.singleMode = "maybe";
    return this;
  }

  insert(payload: Row | Row[]): this {
    this.mode = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: Row): this {
    this.mode = "update";
    this.payload = payload;
    return this;
  }

  delete(): this {
    this.mode = "delete";
    return this;
  }

  /** Renders the `$$` markers into numbered parameters, starting at `startAt`. */
  private buildWhere(startAt: number): { sql: string; values: unknown[] } {
    if (this.filters.length === 0) return { sql: "", values: [] };
    const values: unknown[] = [];
    let n = startAt;
    const parts = this.filters.map((f) => {
      let sql = f.sql;
      for (const v of f.values) {
        sql = sql.replace("$$", `$${n}`);
        values.push(v);
        n += 1;
      }
      return sql;
    });
    return { sql: ` where ${parts.join(" and ")}`, values };
  }

  /** Resolves embedded selects with one extra query per embed — not per row. */
  private async attachEmbeds(rows: Row[]): Promise<Row[]> {
    for (const embed of this.embeds) {
      const keys = [...new Set(rows.map((r) => r[embed.parentKey]).filter(Boolean))];
      if (keys.length === 0) {
        for (const r of rows) r[embed.alias] = embed.many ? [] : null;
        continue;
      }

      const res = await query<Row>(
        `select * from public."${embed.table}" where "${embed.foreignKey}" = any($1)`,
        [keys],
      );
      let children = res.rows;

      if (embed.child) {
        const child = embed.child;
        const subKeys = [...new Set(children.map((c) => c[child.parentKey]).filter(Boolean))];
        const subRes = subKeys.length
          ? await query<Row>(
              `select * from public."${child.table}" where "${child.foreignKey}" = any($1)`,
              [subKeys],
            )
          : { rows: [] as Row[] };
        const subByKey = new Map(subRes.rows.map((s) => [s[child.foreignKey], s]));
        children = children.map((c) => ({
          ...c,
          [child.alias]: subByKey.get(c[child.parentKey]) ?? null,
        }));
      }

      for (const r of rows) {
        const matches = children.filter((c) => c[embed.foreignKey] === r[embed.parentKey]);
        r[embed.alias] = embed.many ? matches : (matches[0] ?? null);
      }
    }
    return rows;
  }

  private async run(): Promise<Result<T>> {
    try {
      let rows: Row[] = [];
      let count: number | undefined;

      if (this.mode === "select") {
        const parsed = await parseSelect(this.rawSelect, this.table);
        this.selectStr = parsed.columns;
        this.embeds = parsed.embeds;

        const where = this.buildWhere(1);
        const orderSql = this.orderParts.length ? ` order by ${this.orderParts.join(", ")}` : "";
        // Numeric coercion, not interpolated user input.
        const limitSql = this.limitValue != null ? ` limit ${Number(this.limitValue)}` : "";
        const offsetSql = this.offsetValue != null ? ` offset ${Number(this.offsetValue)}` : "";

        if (this.wantCount) {
          const c = await query<{ count: number }>(
            `select count(*)::int as count from public."${this.table}"${where.sql}`,
            where.values,
          );
          count = Number(c.rows[0]?.count ?? 0);
        }

        const res = await query<Row>(
          `select ${this.selectStr} from public."${this.table}"${where.sql}${orderSql}${limitSql}${offsetSql}`,
          where.values,
        );
        rows = res.rows;
        if (this.embeds.length) rows = await this.attachEmbeds(rows);
      } else if (this.mode === "insert") {
        const list = Array.isArray(this.payload) ? this.payload : [this.payload as Row];
        if (list.length === 0) return { data: [] as T[], error: null };
        // Drop keys whose value is `undefined`. supabase-js sends its payload
        // as JSON, where those keys simply vanish and the column falls back
        // to its DEFAULT; here they became an explicit NULL instead, which a
        // NOT NULL column rejects however sensible its default is.
        //
        // Real symptom: adding a menu item failed with `null value in column
        // "sort_order" violates not-null constraint`, because the action
        // always passes sort_order and it is undefined when adding. `null`
        // is kept as-is — that is a caller asking for NULL on purpose.
        const cols = Object.keys(list[0]).filter((c) => list[0][c] !== undefined);
        const values: unknown[] = [];
        const tuples = list.map((row) => {
          const ph = cols.map((c) => {
            values.push(serialise(row[c]));
            return `$${values.length}`;
          });
          return `(${ph.join(", ")})`;
        });
        const res = await query<Row>(
          `insert into public."${this.table}" (${cols.map((c) => `"${c}"`).join(", ")}) values ${tuples.join(", ")} returning *`,
          values,
        );
        rows = res.rows;
      } else if (this.mode === "update") {
        // Same reasoning as the insert above, and it matters more here: an
        // undefined field meant "leave this column alone" to supabase-js,
        // but would have written an explicit NULL over the existing value.
        const entries = Object.entries(this.payload as Row).filter(([, v]) => v !== undefined);
        // Every field was undefined, so there is nothing to change. Emitting
        // `set` with no assignments would be a syntax error; supabase-js
        // treats this as a no-op, so return the rows the filter selects.
        if (entries.length === 0) {
          const w = this.buildWhere(1);
          const res = await query<Row>(`select * from public."${this.table}"${w.sql}`, w.values);
          rows = res.rows;
        } else {
          const values: unknown[] = [];
          const sets = entries.map(([c, v]) => {
            values.push(serialise(v));
            return `"${c}" = $${values.length}`;
          });
          const where = this.buildWhere(values.length + 1);
          const res = await query<Row>(
            `update public."${this.table}" set ${sets.join(", ")}${where.sql} returning *`,
            [...values, ...where.values],
          );
          rows = res.rows;
        }
      } else {
        const where = this.buildWhere(1);
        const res = await query<Row>(
          `delete from public."${this.table}"${where.sql} returning *`,
          where.values,
        );
        rows = res.rows;
      }

      if (this.singleMode === "single") {
        if (rows.length === 0) {
          // Mirrors PostgREST: .single() with no row is an error, and
          // callers already branch on that.
          return { data: null, error: { message: "no rows returned", code: "PGRST116" }, count };
        }
        return { data: rows[0] as T, error: null, count };
      }
      if (this.singleMode === "maybe") {
        return { data: (rows[0] as T) ?? null, error: null, count };
      }
      return { data: rows as T[], error: null, count };
    } catch (err) {
      const e = err as Error & { code?: string };
      return { data: null, error: { message: e.message, code: e.code } };
    }
  }

  then<TResult1 = Result<T>, TResult2 = never>(
    onfulfilled?: ((value: Result<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }
}

/** The `supabase`-shaped entry point the DataSource already calls. */
export const pgClient = {
  from<T = Row>(table: string): PgQuery<T> {
    return new PgQuery<T>(table);
  },
};
