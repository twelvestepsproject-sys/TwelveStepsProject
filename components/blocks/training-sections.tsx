import type { z } from "zod";
import Image from "next/image";
import type {
  Media,
  Training,
  trainingIntroBlockDataSchema,
  trainingBodyBlockDataSchema,
  trainingSyllabusBlockDataSchema,
  trainingInstructorsBlockDataSchema,
  trainingRegistrationCtaBlockDataSchema,
} from "@/lib/schemas";
import { mediaUrlFor } from "@/lib/media";
import { formatPrice, formatHours } from "@/lib/format";

/**
 * §5 blocks 25-29 — the training page's own sections, extracted from what
 * used to be a fixed sequence in app/(site)/hachsharot/[slug]/page.tsx so
 * an editor can reorder, hide, or interleave them with ordinary content
 * blocks (migration 20).
 *
 * These differ from every other block in one way: their content comes from
 * the `training` prop, not from `data`. `data` carries only presentation
 * choices (heading override, show/hide toggles). That keeps
 * /admin/trainings the single place a training's title, price, syllabus and
 * instructors are edited — the client's requirement that existing
 * functionality stay intact — with no second copy that could drift.
 *
 * Markup is preserved from the original page so converted trainings look
 * identical to how they looked before.
 */

export function TrainingIntro({
  data,
  training,
  cover,
}: {
  data: z.infer<typeof trainingIntroBlockDataSchema>;
  training: Training;
  cover: Media | null;
}) {
  const price = formatPrice(training.price);
  const showCover = data.show_cover !== false;
  const showDetails = data.show_details !== false;

  return (
    <>
      {showCover && cover ? (
        <Image
          src={mediaUrlFor(cover)}
          alt={cover.alt_he}
          width={cover.width}
          height={cover.height}
          priority
          className="mb-8 h-64 w-full rounded-lg object-cover sm:h-80"
        />
      ) : null}

      <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">{training.title}</h1>
      <p className="mt-4 text-lg text-ink-muted">{training.excerpt}</p>

      {showDetails ? (
        <dl className="mt-6 grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface p-5 text-sm min-[420px]:grid-cols-2 sm:grid-cols-4">
          {training.starts_on ? (
            <div>
              <dt className="font-semibold text-ink">תאריך התחלה</dt>
              <dd className="break-words text-ink-muted">{training.starts_on}</dd>
            </div>
          ) : null}
          {training.meeting_day ? (
            <div>
              <dt className="font-semibold text-ink">ימי מפגש</dt>
              <dd className="break-words text-ink-muted">{training.meeting_day}</dd>
            </div>
          ) : null}
          {training.meeting_time ? (
            <div>
              <dt className="font-semibold text-ink">שעות מפגש</dt>
              <dd className="break-words text-ink-muted">{training.meeting_time}</dd>
            </div>
          ) : null}
          <div>
            <dt className="font-semibold text-ink">היקף</dt>
            <dd className="break-words text-ink-muted">{formatHours(training.academic_hours)}</dd>
          </div>
          {price ? (
            <div>
              <dt className="font-semibold text-ink">מחיר</dt>
              <dd className="break-words text-ink-muted">{price}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </>
  );
}

export function TrainingBody({
  data,
  training,
}: {
  data: z.infer<typeof trainingBodyBlockDataSchema>;
  training: Training;
}) {
  if (!training.body?.trim()) return null;
  return (
    <section className="mt-8">
      {data.heading ? (
        <h2 className="mb-3 font-display text-xl font-bold text-ink">{data.heading}</h2>
      ) : null}
      <div className="prose prose-ink max-w-none whitespace-pre-line text-ink">{training.body}</div>
    </section>
  );
}

export function TrainingSyllabus({
  data,
  training,
}: {
  data: z.infer<typeof trainingSyllabusBlockDataSchema>;
  training: Training;
}) {
  if (training.syllabus.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-bold text-ink">
        {data.heading ?? "תוכנית הלימודים"}
      </h2>
      <ol className="mt-4 flex flex-col gap-4">
        {training.syllabus.map((item, i) => (
          <li key={i} className="rounded-md border border-border bg-surface p-4">
            <p className="font-display font-bold text-ink">{item.title}</p>
            <p className="mt-1 text-sm text-ink-muted">{item.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function TrainingInstructors({
  data,
  training,
}: {
  data: z.infer<typeof trainingInstructorsBlockDataSchema>;
  training: Training;
}) {
  if (training.instructors.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-bold text-ink">
        {data.heading ?? "מרצים ומדריכים"}
      </h2>
      <ul className="mt-4 flex flex-wrap gap-4">
        {training.instructors.map((instructor) => (
          <li key={instructor.id} className="rounded-md border border-border bg-surface px-4 py-2">
            <p className="font-display font-bold text-ink">{instructor.name}</p>
            <p className="text-xs text-ink-muted">{instructor.role}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TrainingRegistrationCta({
  data,
  training,
}: {
  data: z.infer<typeof trainingRegistrationCtaBlockDataSchema>;
  training: Training;
}) {
  // Prefers the training's own registration_url when set, falling back to
  // the site-wide registration modal — the original page's behavior.
  const href = training.registration_url?.trim() ? training.registration_url : "#registration-modal";
  const isExternal = href.startsWith("http");

  return (
    <div className="mt-10 rounded-lg bg-primary p-6 text-center text-primary-fg">
      <p className="mb-4 font-display text-lg font-bold">
        {data.heading ?? "מעוניינים להצטרף להכשרה?"}
      </p>
      <a
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noreferrer" : undefined}
        className="inline-block rounded-full bg-accent px-6 py-3 font-semibold text-accent-fg transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-lg"
      >
        {data.cta_label ?? "לתיאום שיחת היכרות"}
      </a>
    </div>
  );
}
