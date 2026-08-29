import type { z } from "zod";
import Image from "next/image";
import type { certificatesBlockDataSchema } from "@/lib/schemas";
import { db } from "@/lib/queries";
import { mediaUrlFor } from "@/lib/media";
import { Skeleton } from "./skeleton";
import { RevealOnScroll } from "./_shared/reveal-on-scroll";

/**
 * §5 block 31 — Certificates. Centred heading and intro over a row of
 * certificate images, matching the accreditation section on the
 * psychotherapy pages.
 *
 * Async because each item stores a `media_id` resolved through
 * `db.getMedia()` — the same pattern as reading-list/link-cards, never a
 * URL denormalized into the block data.
 *
 * `object-contain` rather than `object-cover`: a certificate must never be
 * cropped, and the two images in the reference design have different
 * aspect ratios (a portrait cover next to a landscape certificate). A
 * fixed height with contain keeps them visually aligned without cutting
 * either one.
 *
 * Alt text comes from the `media` row (mandatory there per §3). The
 * optional caption is supplementary, so it is NOT used as alt text — that
 * would leave an uncaptioned certificate with no accessible name.
 */
type CertificatesData = z.infer<typeof certificatesBlockDataSchema>;

export async function Certificates({ data }: { data: CertificatesData }) {
  const items = (data.items ?? []).filter((item) => item.media_id);

  if (items.length === 0) return null;

  const media = await Promise.all(items.map((item) => db.getMedia(item.media_id!)));
  const resolved = items
    .map((item, i) => ({ item, media: media[i] }))
    .filter((entry) => entry.media !== null);

  // Every referenced media row is gone (deleted from the library) — render
  // nothing rather than a heading over empty space.
  if (resolved.length === 0) return null;

  return (
    <section className="bg-bg px-6 py-16">
      <RevealOnScroll className="mx-auto max-w-5xl text-center">
        <h2 className="font-display text-2xl font-bold text-primary sm:text-3xl">{data.heading}</h2>

        {data.intro ? (
          <p className="mx-auto mt-3 max-w-3xl whitespace-pre-line text-ink-muted">{data.intro}</p>
        ) : null}

        <div className="mt-10 flex flex-wrap items-start justify-center gap-8">
          {resolved.map(({ item, media: m }, i) => (
            <figure key={i} className="flex max-w-xs flex-col items-center gap-3">
              <Image
                src={mediaUrlFor(m!)}
                alt={m!.alt_he}
                width={m!.width}
                height={m!.height}
                // The declared width is the FILE's, so without `sizes` the
                // srcset is built for that and asks for w=1920 — but the
                // figure is capped at max-w-xs (320px). Past an image's
                // natural width the optimizer returns the original file
                // unconverted, which is how a 1254px PNG shipped as 1.8MB.
                sizes="320px"
                className="h-auto max-h-[26rem] w-auto rounded-md object-contain shadow-md"
              />
              {item.caption ? (
                <figcaption className="text-sm text-ink-muted">{item.caption}</figcaption>
              ) : null}
            </figure>
          ))}
        </div>
      </RevealOnScroll>
    </section>
  );
}

export function CertificatesSkeleton() {
  return (
    <section className="bg-bg px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <Skeleton className="mx-auto mb-4 h-8 w-80" />
        <Skeleton className="mx-auto mb-10 h-4 w-full max-w-2xl" />
        <div className="flex flex-wrap justify-center gap-8">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-80 w-56" />
          ))}
        </div>
      </div>
    </section>
  );
}
