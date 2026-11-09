"use client";

import { useCallback } from "react";

import { AdminPage } from "@/components/layout/admin-shell";
import { ErrorBlock, LoadingBlock } from "@/components/ui/feedback";
import { useAsync } from "@/hooks/use-async";
import { formatDateTime } from "@/lib/format";
import { api } from "@/services";

export function AdminAuditView() {
  const load = useCallback(() => api.listAudit(), []);
  const { state, reload } = useAsync(load);
  return (
    <AdminPage title="Audit log">
      {state.status === "loading" ? <LoadingBlock label="Loading audit log" /> : null}
      {state.status === "error" ? <ErrorBlock error={state.error} onRetry={reload} /> : null}
      {state.status === "ready" ? (
        <ul className="flex max-w-[780px] flex-col gap-5">
          {state.data.map((entry) => (
            <li key={entry.id}>
              <p className="text-xl font-medium">{entry.action}</p>
              <p className="text-base text-muted">
                {formatDateTime(entry.createdAt)} &middot; {entry.actor}
              </p>
              {entry.reason ? <p className="mt-1 text-lg">Reason: {entry.reason}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </AdminPage>
  );
}
