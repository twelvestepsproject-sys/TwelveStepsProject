import { ChangePasswordForm } from "./change-password-form";

export default function AccountPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-ink">החלפת סיסמה</h1>
      <ChangePasswordForm />
    </div>
  );
}
