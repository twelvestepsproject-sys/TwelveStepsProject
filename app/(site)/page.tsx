import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
import { renderBlock } from "@/components/blocks";

/**
 * The real homepage (§16 Phase 3 / §5). Reads `db.getPage("home")` to get
 * the ordered, visibility-filtered list of `page_blocks` (filtering and
 * sorting already happened inside the mock data source — see
 * lib/queries/mock/index.ts `getPage`), then renders each block by its
 * `block_type` via the lookup in components/blocks/index.tsx. Block
 * order/visibility is therefore DB-driven, not hardcoded here, per §5's
 * closing line.
 */
export default async function HomePage() {
  const page = await db.getPage("home");

  if (!page) {
    // getPage() returns null for a missing OR unpublished page — see the
    // friction note in the final report re: whether a distinct "found but
    // unpublished" signal is needed for Draft Mode/admin preview (Phase 4).
    notFound();
  }

  return <main>{page.blocks.map((block) => renderBlock(block))}</main>;
}
