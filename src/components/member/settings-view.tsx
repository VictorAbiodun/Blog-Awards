"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, PasswordField } from "@/components/ui/field";
import { Avatar, Notice } from "@/components/ui/feedback";
import { useSession, useUser } from "@/hooks/session";
import { errorMessage } from "@/lib/error-message";
import { fieldErrors } from "@/lib/form";
import { changePasswordSchema, profileSchema } from "@/lib/validation";
import { api } from "@/services";

type Message = { tone: "info" | "error"; text: string } | null;

export function SettingsView() {
  const user = useUser();
  const router = useRouter();
  const { refresh, signOut } = useSession();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileMessage, setProfileMessage] = useState<Message>(null);

  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordMessage, setPasswordMessage] = useState<Message>(null);

  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleteProblem, setDeleteProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setProfileMessage(null);
    const parsed = profileSchema.safeParse({ displayName });
    if (!parsed.success) return setProfileErrors(fieldErrors(parsed.error));
    setProfileErrors({});
    try {
      await api.updateProfile(parsed.data);
      refresh();
      setProfileMessage({ tone: "info", text: "Profile saved." });
    } catch (error) {
      setProfileMessage({ tone: "error", text: errorMessage(error) });
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordMessage(null);
    const parsed = changePasswordSchema.safeParse(passwords);
    if (!parsed.success) return setPasswordErrors(fieldErrors(parsed.error));
    setPasswordErrors({});
    try {
      await api.changePassword({ currentPassword: parsed.data.currentPassword, newPassword: parsed.data.newPassword });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordMessage({ tone: "info", text: "Password updated." });
    } catch (error) {
      setPasswordMessage({ tone: "error", text: errorMessage(error) });
    }
  }

  async function deleteAccount() {
    setBusy(true);
    setDeleteProblem(null);
    try {
      await api.deleteAccount();
      setDeleting(false);
      await signOut();
      router.push("/");
    } catch (error) {
      setDeleteProblem(errorMessage(error));
      setBusy(false);
    }
  }

  return (
    <div className="pb-16 md:pb-24">
      <h1 className="px-5 pb-6 pt-6 font-display text-[24vw] uppercase leading-[0.88] tracking-[-0.02em] md:px-6 md:pb-12 md:pt-10 md:text-[min(10.4vw,9.4rem)]">
        Account
        <br className="md:hidden" /> settings
      </h1>

      <div className="grid gap-6 px-5 md:grid-cols-[600px_560px] md:items-start md:gap-6 md:px-6">
        <form onSubmit={saveProfile} noValidate className="flex flex-col gap-5 bg-elevated p-5 md:p-7">
          <div className="flex items-center gap-4">
            <Avatar name={user.displayName} size={72} />
            <div>
              <h2 className="text-[28px] font-bold leading-[1.1] md:text-[32px]">Profile</h2>
              <p className="text-base text-muted">Profile image: initials</p>
            </div>
          </div>
          {profileMessage ? <Notice tone={profileMessage.tone}>{profileMessage.text}</Notice> : null}
          <Field tone="ground" label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} error={profileErrors.displayName} hint="Just a friendly name. It is not a public username." />
          <Field tone="ground" label="Email" value={user.email} readOnly hint={user.emailConfirmed ? "Email verified. To change it, contact us." : "Email not confirmed yet."} />
          <Button type="submit" size="lg" full>
            Save profile
          </Button>
        </form>

        <div className="flex flex-col gap-6">
          <form onSubmit={savePassword} noValidate className="flex flex-col gap-5 bg-elevated p-5 md:p-7">
            <h2 className="text-[28px] font-bold leading-[1.1] md:text-[32px]">Change password</h2>
            {passwordMessage ? <Notice tone={passwordMessage.tone}>{passwordMessage.text}</Notice> : null}
            <PasswordField tone="ground" label="Current password" autoComplete="current-password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} error={passwordErrors.currentPassword} />
            <PasswordField tone="ground" label="New password" autoComplete="new-password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} error={passwordErrors.newPassword} hint="At least 8 characters" />
            <PasswordField tone="ground" label="Confirm new password" autoComplete="new-password" value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} error={passwordErrors.confirmPassword} />
            <Button type="submit" size="lg" full>
              Update password
            </Button>
            <Button
              tone="ground"
              size="lg"
              full
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
            >
              Log out of this device
            </Button>
          </form>

          <section aria-labelledby="delete-title" className="flex flex-col gap-3.5 bg-orange p-5 text-on-color md:p-7">
            <h2 id="delete-title" className="text-[28px] font-bold leading-[1.1] md:text-[32px]">
              Delete account
            </h2>
            <p className="text-lg leading-[1.4]">
              Deleting your account removes your profile. Unused credits are handled under the published refund and unused-credits policy. You will be asked to confirm.
            </p>
            <Button tone="black" size="lg" full onClick={() => setDeleting(true)}>
              Delete my account
            </Button>
          </section>
        </div>
      </div>

      <Dialog open={deleting} onClose={() => setDeleting(false)} title="Delete your account?">
        <p className="text-lg leading-[1.45]">This removes your profile and cannot be undone. Type <strong>DELETE</strong> to confirm.</p>
        <Field tone="ground" label="Type DELETE" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
        {deleteProblem ? <Notice>{deleteProblem}</Notice> : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button tone="orange" size="lg" full disabled={confirmText !== "DELETE" || busy} onClick={deleteAccount}>
            {busy ? "Deleting\u2026" : "Delete my account"}
          </Button>
          <Button tone="ground" size="lg" full disabled={busy} onClick={() => setDeleting(false)}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
