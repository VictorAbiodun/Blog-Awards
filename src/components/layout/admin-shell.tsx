"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { PasswordField } from "@/components/ui/field";
import { Avatar, Notice } from "@/components/ui/feedback";
import { useSession } from "@/hooks/session";
import { errorMessage } from "@/lib/error-message";
import { fieldErrors } from "@/lib/form";
import { changePasswordSchema } from "@/lib/validation";
import { api } from "@/services";

const baseNav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/funding", label: "Wallet Funding" },
  { href: "/admin/artists", label: "Artists" },
  { href: "/admin/season", label: "Season & rules" },
  { href: "/admin/payments", label: "Archived Payments" },
  { href: "/admin/suspicious", label: "Suspicious activity" },
  { href: "/admin/winners", label: "Winners & reports" },
  { href: "/admin/audit", label: "Audit log" },
];

function Links({
  onNavigate,
  pendingCount,
  isSuperAdmin,
}: {
  onNavigate?: () => void;
  pendingCount?: number;
  isSuperAdmin?: boolean;
}) {
  const pathname = usePathname();
  const navItems = isSuperAdmin
    ? [...baseNav, { href: "/admin/users", label: "Admins & Roles" }]
    : baseNav;

  return (
    <ul className="flex flex-col gap-1.5">
      {navItems.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        const isFunding = item.href === "/admin/funding";
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center justify-between px-3 py-2.5 text-[19px] ${active ? "bg-gold font-bold text-on-color underline" : "font-medium"}`}
            >
              <span>{item.label}</span>
              {isFunding && pendingCount && pendingCount > 0 ? (
                <span className="rounded-full bg-orange px-2 py-0.5 text-xs font-bold text-white animate-pulse">
                  {pendingCount}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { session, signOut: endSession } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const prevPendingRef = useRef<number>(0);

  // Password change state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordNotice, setPasswordNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [busyPassword, setBusyPassword] = useState(false);

  const signOut = async () => {
    await endSession();
    router.push("/");
  };

  const isSuperAdmin = session.status === "signedIn" && session.user.role === "super_admin";
  const name = session.status === "signedIn" ? session.user.displayName : "Admin";

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordNotice(null);
    const parsed = changePasswordSchema.safeParse(passwords);
    if (!parsed.success) {
      setPasswordErrors(fieldErrors(parsed.error));
      return;
    }
    setPasswordErrors({});
    setBusyPassword(true);
    try {
      await api.changePassword({
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordNotice({ tone: "info", text: "Your password has been successfully updated." });
    } catch (err) {
      setPasswordNotice({ tone: "error", text: errorMessage(err) });
    } finally {
      setBusyPassword(false);
    }
  };

  // Check pending funding requests and notify admin
  useEffect(() => {
    let cancelled = false;
    async function checkPending() {
      try {
        const overview = await api.getAdminFundingOverview();
        if (cancelled) return;

        // Push desktop notification if new pending request arrives
        if (
          overview.pendingCount > prevPendingRef.current &&
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          try {
            new Notification("New OPay Payment Notification", {
              body: `${overview.pendingCount} funding request(s) awaiting your verification in the admin dashboard.`,
              icon: "/icon.svg",
            });
          } catch {
            // Ignore notification constructor errors on certain devices
          }
        }

        prevPendingRef.current = overview.pendingCount;
        setPendingCount(overview.pendingCount);
      } catch {
        // Silently ignore background poll errors
      }
    }

    void checkPending();
    const interval = setInterval(checkPending, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="md:flex md:min-h-svh">
      {/* Desktop sidebar */}
      <aside className="hidden w-[280px] shrink-0 flex-col justify-between bg-surface px-5 py-7 md:flex">
        <div className="flex flex-col gap-7">
          <div>
            <Link href="/" className="font-display text-[30px] leading-none">
              BLOG AWARD 2.0
            </Link>
            <p className="mt-1 text-[19px] font-semibold text-muted">
              {isSuperAdmin ? "Super Admin" : "Admin"}
            </p>
          </div>
          <nav aria-label="Admin">
            <Links pendingCount={pendingCount} isSuperAdmin={isSuperAdmin} />
          </nav>
        </div>

        <div className="flex flex-col gap-3 border-t border-ground pt-4">
          <div className="flex items-center gap-3">
            <Avatar name={name} size={40} />
            <div className="flex flex-col min-w-0">
              <span className="truncate font-semibold text-ink text-base">{name}</span>
              <span className="text-xs text-muted uppercase font-bold tracking-wider">
                {isSuperAdmin ? "Super Admin" : "Admin"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm font-medium">
            <button
              type="button"
              onClick={() => {
                setPasswordNotice(null);
                setPasswordErrors({});
                setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
                setPasswordDialogOpen(true);
              }}
              className="underline underline-offset-4 hover:text-gold transition-colors"
            >
              Change password
            </button>
            <span className="text-muted">•</span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="underline underline-offset-4 hover:text-orange transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar and drawer */}
      <div className="md:hidden">
        <div className="flex items-center justify-between bg-surface px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="font-display text-[26px] leading-none">
              BLOG AWARD 2.0
            </Link>
            <span className="text-lg font-semibold text-muted">
              {isSuperAdmin ? "Super Admin" : "Admin"}
            </span>
          </div>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="admin-menu"
            onClick={() => setOpen((v) => !v)}
            className="text-xl font-bold underline underline-offset-4"
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
        {open ? (
          <nav id="admin-menu" aria-label="Admin" className="bg-surface px-5 pb-5">
            <Links
              onNavigate={() => setOpen(false)}
              pendingCount={pendingCount}
              isSuperAdmin={isSuperAdmin}
            />
            <div className="mt-4 flex items-center gap-4 border-t border-ground pt-3 text-base font-medium">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setPasswordNotice(null);
                  setPasswordErrors({});
                  setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  setPasswordDialogOpen(true);
                }}
                className="underline underline-offset-4"
              >
                Change password
              </button>
              <span className="text-muted">•</span>
              <button
                type="button"
                onClick={() => void signOut()}
                className="underline underline-offset-4"
              >
                Log out
              </button>
            </div>
          </nav>
        ) : null}
      </div>

      <main id="main" className="min-w-0 flex-1 px-5 pb-24 pt-6 md:px-10 md:pb-24 md:pt-8">
        {children}
      </main>

      {/* Change Password Dialog */}
      <Dialog
        open={passwordDialogOpen}
        onClose={() => !busyPassword && setPasswordDialogOpen(false)}
        title="Change Password"
      >
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4 text-base">
          {passwordNotice ? <Notice tone={passwordNotice.tone}>{passwordNotice.text}</Notice> : null}

          <PasswordField
            label="Current password"
            value={passwords.currentPassword}
            onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
            error={passwordErrors.currentPassword}
            required
            autoComplete="current-password"
          />

          <PasswordField
            label="New password"
            value={passwords.newPassword}
            onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
            error={passwordErrors.newPassword}
            hint="At least 8 characters"
            required
            autoComplete="new-password"
          />

          <PasswordField
            label="Confirm new password"
            value={passwords.confirmPassword}
            onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
            error={passwordErrors.confirmPassword}
            required
            autoComplete="new-password"
          />

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              tone="elevated"
              size="sm"
              onClick={() => setPasswordDialogOpen(false)}
              disabled={busyPassword}
            >
              Cancel
            </Button>
            <Button type="submit" tone="gold" size="sm" disabled={busyPassword}>
              {busyPassword ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

/** Big page title with the season on the right, as in the designs. */
export function AdminPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-8 md:gap-9">
      <header className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
        <h1 className="font-display text-[22vw] uppercase leading-[0.88] tracking-[-0.02em] md:text-[min(10.4vw,9.4rem)]">{title}</h1>
        <div className="md:text-right">
          <p className="text-[19px] font-semibold">Season: 2026 Awards</p>
          <p className="text-[17px] text-muted">Sample data for design review.</p>
        </div>
      </header>
      {children}
    </div>
  );
}
