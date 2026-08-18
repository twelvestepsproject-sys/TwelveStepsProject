import type { z } from "zod";
import type { syllabusDownloadBlockDataSchema } from "@/lib/schemas";
import { db } from "@/lib/queries";
import { mediaUrlFor } from "@/lib/media";
import { Skeleton } from "./skeleton";
import { RevealOnScroll } from "./_shared/reveal-on-scroll";

/**
 * §5 block 32 — Syllabus download button.
 *
 * The file is either an uploaded PDF (`file_media_id`, resolved through
 * `db.getMedia()` like every other media reference) or an external URL
 * (`file_url`, for a file hosted on Drive/Dropbox). The uploaded file wins
 * when both are set — it is the more deliberate choice, and it is the one
 * an editor picked through the media browser.
 *
 * No `download` attribute: it only forces a save for same-origin URLs and
 * is silently ignored cross-origin, so it would behave inconsistently
 * between an uploaded file and a Drive link. Opening in a new tab is
 * honest in both cases, and the browser's PDF viewer offers the download.
 */
type SyllabusDownloadData = z.infer<typeof syllabusDownloadBlockDataSchema>;

export async function SyllabusDownload({ data }: { data: SyllabusDownloadData }) {
  const uploaded = data.file_media_id ? await db.getMedia(data.file_media_id) : null;
  const href = uploaded ? mediaUrlFor(uploaded) : data.file_url?.trim();

  // No file yet — render nothing rather than a dead button. An editor who
  // added the block but hasn't chosen a file sees nothing on the live page,
  // which is better than a button that goes nowhere.
  if (!href) return null;

  return (
    <section className="bg-bg px-6 py-12">
      <RevealOnScroll className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        {data.heading ? (
          <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">{data.heading}</h2>
        ) : null}

        {data.body ? (
          <p className="whitespace-pre-line text-ink-muted">{data.body}</p>
        ) : null}

        <a
          href={href}
          target={data.open_in_new_tab !== false ? "_blank" : undefined}
          rel={data.open_in_new_tab !== false ? "noreferrer" : undefined}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-semibold text-primary-fg transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-lg active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span>{data.button_label ?? "סילבוס להורדה"}</span>
          {/* Decorative: the label already says what the button does. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M12 3v12" />
            <path d="m7 12 5 5 5-5" />
            <path d="M5 21h14" />
          </svg>
        </a>
      </RevealOnScroll>
    </section>
  );
}

export function SyllabusDownloadSkeleton() {
  return (
    <section className="bg-bg px-6 py-12">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-11 w-48 rounded-full" />
      </div>
    </section>
  );
}
