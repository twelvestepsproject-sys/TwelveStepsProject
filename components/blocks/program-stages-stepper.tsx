import type { z } from "zod";
import type { programStagesBlockDataSchema } from "@/lib/schemas";
import { db } from "@/lib/queries";
import { Skeleton } from "./skeleton";
import { RevealOnScroll } from "./_shared/reveal-on-scroll";

/**
 * §5 block 13 — Program stages stepper/accordion. Reads
 * `db.getProgramStages()`, which returns stages with `steps` already
 * nested and sorted (no join in this component). Deliberately
 * non-uniform step counts per stage (2/4/3/2/3 in the fixtures) —
 * rendered as a plain ordered list per stage rather than a fixed-column
 * grid, since a uniform grid would hide that non-uniformity.
 */
type ProgramStagesData = z.infer<typeof programStagesBlockDataSchema>;

export async function ProgramStagesStepper({ data }: { data: ProgramStagesData }) {
  const stages = await db.getProgramStages();

  if (stages.length === 0) return null;

  return (
    <section className="bg-surface px-6 py-16">
      <RevealOnScroll className="mx-auto max-w-5xl">
        {data.heading ? (
          <h2 className="mb-10 text-center font-display text-2xl font-bold text-ink sm:text-3xl">
            {data.heading}
          </h2>
        ) : null}
        <ol className="flex flex-col gap-8">
          {stages.map((stage) => (
            <li
              key={stage.id}
              className="rounded-lg border border-border bg-bg p-6 transition-shadow duration-300 hover:shadow-md"
            >
              <div className="mb-4 flex items-baseline gap-3">
                <span className="font-display text-sm font-bold text-accent-text">
                  שלב {stage.stage_number}
                </span>
                <h3 className="font-display text-xl font-bold text-ink">{stage.title}</h3>
              </div>
              {stage.subtitle ? (
                <p className="mb-4 text-sm text-ink-muted">{stage.subtitle}</p>
              ) : null}
              <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {stage.steps.map((step) => (
                  <li
                    key={step.id}
                    className="rounded-md border border-border bg-surface p-4 transition-colors duration-300 hover:border-primary/40"
                  >
                    <p className="mb-1 text-xs font-semibold text-ink-muted">
                      צעד {step.step_number}
                    </p>
                    <p className="mb-1 font-display font-bold text-ink">{step.title}</p>
                    <p className="text-sm text-ink-muted">{step.body}</p>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      </RevealOnScroll>
    </section>
  );
}

export function ProgramStagesStepperSkeleton() {
  return (
    <section className="bg-surface px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <Skeleton className="mx-auto mb-10 h-8 w-48" />
        <div className="flex flex-col gap-8">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    </section>
  );
}
