import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
import { mediaUrlFor } from "@/lib/media";

/**
 * `/odot/[person-slug]` — Individual lecturer bio pages (§4
 * `/[about]/[person-slug]`). Per §6, only lecturers with a `page_slug` set
 * get a dedicated bio page — the rest appear only in the grid. Reads
 * `db.getLecturer(idOrSlug)`, which resolves by id OR `page_slug` on the
 * current interface.
 *
 * A lecturer without `is_visible` must not get a public bio page even if a
 * `page_slug` happens to be set (matches the grid's own visibility gate),
 * so this route treats "not visible" the same as "not found".
 *
 * Percent-encoded Hebrew slugs: same proven decode as every other dynamic
 * segment in this pass — see hachsharot/[slug]/page.tsx's header comment.
 */
interface PageProps {
  params: Promise<{ "person-slug": string }>;
}

export async function generateStaticParams() {
  const lecturers = await db.listLecturers({ visibleOnly: true });
  return lecturers
    .filter((l) => l.page_slug !== null)
    .map((l) => ({ "person-slug": l.page_slug as string }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { "person-slug": rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const lecturer = await db.getLecturer(slug);
  if (!lecturer || !lecturer.is_visible) return {};

  return {
    title: `${lecturer.name} | מכללת אשד`,
    description: lecturer.bio,
  };
}

export default async function LecturerBioPage({ params }: PageProps) {
  const { "person-slug": rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const lecturer = await db.getLecturer(slug);

  if (!lecturer || !lecturer.is_visible || !lecturer.page_slug) notFound();

  const photo = lecturer.photo_id ? await db.getMedia(lecturer.photo_id) : null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="flex flex-col items-center gap-4 text-center">
        {photo ? (
          <Image
            src={mediaUrlFor(photo)}
            alt={photo.alt_he}
            width={140}
            height={140}
            className="h-36 w-36 rounded-full object-cover"
          />
        ) : (
          <div
            className="h-36 w-36 rounded-full bg-surface-alt"
            role="img"
            aria-label={lecturer.name}
          />
        )}
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{lecturer.name}</h1>
        <p className="text-ink-muted">{lecturer.role}</p>
      </div>
      <div className="mt-8 whitespace-pre-line text-ink">{lecturer.bio}</div>
      <div className="mt-10 text-center">
        <Link
          href="/odot#martsim"
          className="font-semibold text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline"
        >
          חזרה לכל המרצים
        </Link>
      </div>
    </main>
  );
}
