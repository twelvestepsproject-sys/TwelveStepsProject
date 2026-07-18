import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { AdminEmptyState } from "@/components/admin/states";
import { StagesEditor } from "./stages-editor";

/**
 * §8: no draft/published concept for program_stages/steps (§6 has no
 * `status` field on either — checked, not assumed). One screen for both
 * collections given the small, deliberately-fixed dataset shape (§5.5:
 * 5 stages, 2/4/3/2/3 steps = 14 total) — separate list+edit screens per
 * collection would be more navigation for less content than the other
 * screens in this pass.
 */
export default async function ProgramStagesPage() {
  const [stages, session] = await Promise.all([db.getProgramStages(), getDevSession()]);
  const canEdit = session?.role === "admin" || session?.role === "editor";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-ink">שלבי התוכנית</h1>
      <p className="text-sm text-ink-muted">
        מבנה התוכנית של המכללה: שלבים, ובכל שלב רשימת צעדים. אין כאן מושג של טיוטה/פרסום — כל שינוי
        נשמר ומיד גלוי באתר.
      </p>
      {stages.length === 0 ? (
        <AdminEmptyState message="אין שלבים עדיין." />
      ) : (
        <StagesEditor stages={stages} canEdit={canEdit} />
      )}
    </div>
  );
}
