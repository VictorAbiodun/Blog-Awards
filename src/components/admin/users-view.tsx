"use client";

import { useCallback, useState } from "react";

import { AdminPage } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorBlock, FilterChip, LoadingBlock, Notice } from "@/components/ui/feedback";
import { useSession } from "@/hooks/session";
import { useAsync } from "@/hooks/use-async";
import { errorMessage } from "@/lib/error-message";
import { formatDateTime, formatNumber } from "@/lib/format";
import { api } from "@/services";
import type { ManagedUser } from "@/types/domain";

type RoleFilter = "all" | "admin" | "fan";

export function AdminUsersView() {
  const { session } = useSession();
  const isSuperAdmin = session.status === "signedIn" && session.user.role === "super_admin";

  const loadUsers = useCallback(async () => {
    return api.listAdminUsers();
  }, []);

  const { state, reload } = useAsync(loadUsers);

  const [filter, setFilter] = useState<RoleFilter>("all");
  const [search, setSearch] = useState("");

  // Role change modal state
  const [targetUser, setTargetUser] = useState<ManagedUser | null>(null);
  const [newRole, setNewRole] = useState<"admin" | "fan">("admin");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  if (!isSuperAdmin) {
    return (
      <AdminPage title="Admins & Roles">
        <Notice tone="error">
          Access Restricted: Only the Super Administrator can access role management.
        </Notice>
      </AdminPage>
    );
  }

  if (state.status === "loading") {
    return (
      <AdminPage title="Admins & Roles">
        <LoadingBlock label="Loading user accounts and roles..." />
      </AdminPage>
    );
  }

  if (state.status === "error") {
    return (
      <AdminPage title="Admins & Roles">
        <ErrorBlock error={state.error} onRetry={reload} />
      </AdminPage>
    );
  }

  const users = state.data;
  const totalUsers = users.length;
  const superAdmins = users.filter((u) => u.role === "super_admin");
  const normalAdmins = users.filter((u) => u.role === "admin");
  const fans = users.filter((u) => u.role === "fan");

  // Filtered list
  const filteredUsers = users.filter((user) => {
    if (filter === "admin" && user.role !== "admin" && user.role !== "super_admin") return false;
    if (filter === "fan" && user.role !== "fan") return false;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = user.displayName.toLowerCase().includes(q);
      const matchEmail = user.email.toLowerCase().includes(q);
      const matchId = user.id.toLowerCase().includes(q);
      return matchName || matchEmail || matchId;
    }

    return true;
  });

  const openRoleModal = (user: ManagedUser, roleToAssign: "admin" | "fan") => {
    setTargetUser(user);
    setNewRole(roleToAssign);
    setActionError(null);
  };

  const closeRoleModal = () => {
    if (busy) return;
    setTargetUser(null);
    setActionError(null);
  };

  const executeRoleChange = async () => {
    if (!targetUser) return;
    setBusy(true);
    setActionError(null);
    try {
      await api.setUserRole({
        targetUserId: targetUser.id,
        role: newRole,
      });

      setActionSuccess(
        `Successfully ${newRole === "admin" ? "promoted" : "demoted"} ${targetUser.displayName} (${targetUser.email}) to ${newRole === "admin" ? "Administrator" : "Fan"}.`,
      );
      setTargetUser(null);
      await reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminPage title="Admins & Roles">
      <div className="flex flex-col gap-8">
        {actionSuccess ? (
          <Notice tone="info">
            <div className="flex items-center justify-between">
              <span>{actionSuccess}</span>
              <button
                type="button"
                onClick={() => setActionSuccess(null)}
                className="text-sm font-semibold underline underline-offset-2 ml-4"
              >
                Dismiss
              </button>
            </div>
          </Notice>
        ) : null}

        {/* Overview metric cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="bg-surface p-5">
            <p className="text-[17px] text-muted">Total Users</p>
            <p className="font-display text-[44px] leading-none mt-1">{formatNumber(totalUsers)}</p>
          </div>
          <div className="bg-surface p-5 border-l-4 border-gold">
            <p className="text-[17px] text-muted">Super Admin</p>
            <p className="font-display text-[44px] leading-none text-gold mt-1">{superAdmins.length}</p>
          </div>
          <div className="bg-surface p-5 border-l-4 border-mint">
            <p className="text-[17px] text-muted">Normal Admins</p>
            <p className="font-display text-[44px] leading-none text-mint mt-1">{normalAdmins.length}</p>
          </div>
          <div className="bg-surface p-5">
            <p className="text-[17px] text-muted">Total Fans</p>
            <p className="font-display text-[44px] leading-none mt-1">{formatNumber(fans.length)}</p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div role="group" aria-label="Filter users by role" className="flex flex-wrap items-center gap-2">
            <FilterChip selected={filter === "all"} onClick={() => setFilter("all")}>
              All ({totalUsers})
            </FilterChip>
            <FilterChip selected={filter === "admin"} onClick={() => setFilter("admin")}>
              Admins ({normalAdmins.length + superAdmins.length})
            </FilterChip>
            <FilterChip selected={filter === "fan"} onClick={() => setFilter("fan")}>
              Fans ({fans.length})
            </FilterChip>
          </div>

          <div className="w-full sm:w-72">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or ID..."
              className="w-full bg-ground border border-elevated px-3 py-2 text-base outline-none focus:border-gold"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto bg-surface">
          <table className="w-full border-collapse text-left text-base">
            <thead>
              <tr className="border-b border-ground text-[15px] uppercase tracking-wider text-muted">
                <th className="p-4 font-semibold">User</th>
                <th className="p-4 font-semibold">User ID</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Joined Date</th>
                <th className="p-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ground">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted">
                    No users found matching your search or filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isUserSuperAdmin = user.role === "super_admin";
                  const isUserAdmin = user.role === "admin";

                  return (
                    <tr key={user.id} className="hover:bg-ground/50 transition-colors">
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-ink text-[17px]">{user.displayName}</span>
                          <span className="text-sm text-muted">{user.email}</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs text-muted">
                        <span title={user.id}>{user.id.substring(0, 8)}...</span>
                      </td>
                      <td className="p-4">
                        {isUserSuperAdmin ? (
                          <span className="inline-block rounded bg-gold px-2.5 py-1 text-xs font-bold text-on-color tracking-wide uppercase">
                            Super Admin
                          </span>
                        ) : isUserAdmin ? (
                          <span className="inline-block rounded bg-mint px-2.5 py-1 text-xs font-bold text-on-color tracking-wide uppercase">
                            Admin
                          </span>
                        ) : (
                          <span className="inline-block rounded bg-ground px-2.5 py-1 text-xs font-medium text-muted uppercase">
                            Fan
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-muted">
                        {formatDateTime(user.createdAt)}
                      </td>
                      <td className="p-4 text-right">
                        {isUserSuperAdmin ? (
                          <span className="text-xs font-semibold text-muted italic">
                            Permanent Super Admin
                          </span>
                        ) : isUserAdmin ? (
                          <Button
                            tone="elevated"
                            size="sm"
                            onClick={() => openRoleModal(user, "fan")}
                            className="!px-3 !py-1.5 text-xs text-orange border border-orange"
                          >
                            Demote to Fan
                          </Button>
                        ) : (
                          <Button
                            tone="elevated"
                            size="sm"
                            onClick={() => openRoleModal(user, "admin")}
                            className="!px-3 !py-1.5 text-xs text-mint border border-mint"
                          >
                            Promote to Admin
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog
        open={Boolean(targetUser)}
        onClose={closeRoleModal}
        title={newRole === "admin" ? "Promote User to Administrator" : "Demote Administrator to Fan"}
      >
        {targetUser ? (
          <div className="flex flex-col gap-5 text-base">
            {actionError ? <Notice tone="error">{actionError}</Notice> : null}

            <p>
              {newRole === "admin" ? (
                <>
                  Are you sure you want to promote{" "}
                  <strong className="text-ink">{targetUser.displayName}</strong> (
                  <span className="font-mono text-sm">{targetUser.email}</span>) to{" "}
                  <strong className="text-mint">Administrator</strong>?
                </>
              ) : (
                <>
                  Are you sure you want to demote{" "}
                  <strong className="text-ink">{targetUser.displayName}</strong> (
                  <span className="font-mono text-sm">{targetUser.email}</span>) back to{" "}
                  <strong className="text-orange">Fan</strong>?
                </>
              )}
            </p>

            <div className="bg-ground p-4 text-sm text-muted">
              {newRole === "admin" ? (
                <ul className="list-disc pl-5 space-y-1">
                  <li>Can access the Admin Dashboard.</li>
                  <li>Can verify and approve manual OPay wallet funding requests.</li>
                  <li>Can manage artists, categories, and season settings.</li>
                  <li>Cannot manage roles or alter the Super Admin.</li>
                </ul>
              ) : (
                <p>
                  This user will immediately lose all administrator access and will only have standard fan permissions.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button tone="elevated" size="sm" onClick={closeRoleModal} disabled={busy}>
                Cancel
              </Button>
              <Button
                tone={newRole === "admin" ? "mint" : "orange"}
                size="sm"
                onClick={executeRoleChange}
                disabled={busy}
              >
                {busy ? "Updating..." : newRole === "admin" ? "Confirm Promotion" : "Confirm Demotion"}
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </AdminPage>
  );
}
