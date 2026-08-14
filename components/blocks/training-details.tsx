import type { z } from "zod";
import type { trainingDetailsBlockDataSchema } from "@/lib/schemas";
import { RevealOnScroll } from "./_shared/reveal-on-scroll";

/**
 * §5 block 21 — Training details panel. Static content from `data` only,
 * no `db` read: unlike `/hachsharot/[slug]`'s visually-equivalent panel
 * (which reads columns off the `trainings` row backing that route), this
 * block carries its own values so it can sit on any page.
 *
 * Every field is optional, so the rows are built by filtering a
 * label/value list rather than a chain of per-field ternaries — an editor
 * who fills in two fields gets a clean two-row panel, and one who fills in
 * none gets no panel at all (rather than an empty bordered box).
 *
 * The `<dl>` grid matches the panel in app/(site)/hachsharot/[slug]/page.tsx
 * so the same information reads identically wherever it appears. Deliberate
 * duplication of ~10 lines of layout: that page's version is fed by typed
 * `trainings` columns (formatted through `formatPrice`/`formatHours`) while
 * this one takes free-text strings, so a shared component would need a prop
 * shape that serves neither cleanly. Kept in sync by eye, not by
 * abstraction, per §5.5's preference for local clarity over premature reuse.
 */
type TrainingDetailsData = z.infer<typeof trainingDetailsBlockDataSchema>;

export function TrainingDetails({ data }: { data: TrainingDetailsData }) {
  const rows: { label: string; value: string }[] = [
    { label: "תאריך התחלה", value: data.starts_on ?? "" },
    { label: "תאריך סיום", value: data.ends_on ?? "" },
    { label: "יום מפגש", value: data.meeting_day ?? "" },
    { label: "שעת מפגש", value: data.meeting_time ?? "" },
    { label: "מספר מפגשים", value: data.sessions_count ?? "" },
    { label: "שעות אקדמיות", value: data.academic_hours ?? "" },
    { label: "מספר סמסטרים", value: data.semesters_count ?? "" },
    { label: "מחיר", value: data.price ?? "" },
  ].filter((row) => row.value.trim() !== "");

  // Nothing filled in and no registration link — render nothing rather than
  // an empty bordered box (a half-configured block shouldn't leave a
  // visible artifact on a published page).
  if (rows.length === 0 && !data.registration_link) return null;

  return (
    <section className="bg-bg px-6 py-12">
      <RevealOnScroll className="mx-auto max-w-3xl">
        {data.heading ? (
          <h2 className="mb-4 font-display text-2xl font-bold text-ink sm:text-3xl">
            {data.heading}
          </h2>
        ) : null}

        {rows.length > 0 ? (
          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-surface p-5 text-sm sm:grid-cols-4">
            {rows.map((row) => (
              <div key={row.label}>
                <dt className="font-semibold text-ink">{row.label}</dt>
                <dd className="text-ink-muted">{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {data.registration_link && data.registration_link.href ? (
          <a
            href={data.registration_link.href}
            target={data.registration_link.open_in_new_tab ? "_blank" : undefined}
            rel={data.registration_link.open_in_new_tab ? "noreferrer" : undefined}
            className="mt-6 inline-block rounded-full bg-accent px-6 py-3 font-semibold text-accent-fg transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-accent-hover hover:shadow-lg active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {data.registration_link.label || "להרשמה"}
          </a>
        ) : null}
      </RevealOnScroll>
    </section>
  );
}
