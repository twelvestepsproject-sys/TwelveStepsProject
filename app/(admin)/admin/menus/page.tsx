import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { AdminErrorState } from "@/components/admin/states";
import { MenuEditor } from "./menu-editor";

const LOCATIONS = [
  { value: "header" as const, label: "תפריט עליון (Header)" },
  { value: "footer_quick" as const, label: "ניווט מהיר בפוטר" },
  { value: "mobile" as const, label: "תפריט מובייל" },
];

/** §8 Menus: "drag-drop nested builder for header/footer/mobile." */
export default async function MenusPage() {
  const session = await getDevSession();
  const isAdmin = session?.role === "admin";

  const [header, footerQuick, mobile] = await Promise.all([
    db.getMenu("header"),
    db.getMenu("footer_quick"),
    db.getMenu("mobile"),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-ink">תפריטים</h1>
      {!isAdmin ? (
        <AdminErrorState message="מסך זה זמין למנהל/ת מערכת בלבד. ניתן לצפות בתפריטים אך לא לשמור שינויים." />
      ) : null}
      <div className="flex flex-col gap-8">
        {LOCATIONS.map(({ value, label }) => (
          <MenuEditor
            key={value}
            location={value}
            label={label}
            initialItems={value === "header" ? header : value === "footer_quick" ? footerQuick : mobile}
            canEdit={isAdmin}
          />
        ))}
      </div>
    </div>
  );
}
