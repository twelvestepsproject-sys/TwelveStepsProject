import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
import { renderBlock } from "@/components/blocks";

/**
 * `/odot` — About + `#martsim` anchor section (§4 `/[about]`). Same
 * page_blocks pattern as the homepage — reads `db.getPage('odot')`
 * (fixture added in lib/mock/fixtures/pages.ts's `odotBlocks`), dispatches
 * via the shared block registry. See that fixture's header comment for the
 * judgment call on why this isn't a bespoke "about page" content model.
 *
 * The `#martsim` anchor (Hebrew for "lecturers") wraps the `lecturers_grid`
 * block instance so `/odot#martsim` (already used by the header's nav
 * dropdown and the homepage's own lecturers_grid link) resolves to a real
 * DOM landmark on this page.
 */
export const metadata: Metadata = {
  title: "אודות | מכללת אשד",
  description: "אודות מכללת אשד — הגישה שלנו, והמרצים והמדריכים שמלווים את התהליך.",
};

export default async function AboutPage() {
  const page = await db.getPage("odot");
  if (!page) notFound();

  return (
    <main>
      {page.blocks.map((block) =>
        block.block_type === "lecturers_grid" ? (
          <div key={block.id} id="martsim">
            {renderBlock(block)}
          </div>
        ) : (
          renderBlock(block)
        ),
      )}
    </main>
  );
}
