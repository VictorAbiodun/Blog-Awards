"use client";

import Link from "next/link";
import { useCallback } from "react";

import { AdminPage } from "@/components/layout/admin-shell";
import { ErrorBlock, LoadingBlock } from "@/components/ui/feedback";
import { useAsync } from "@/hooks/use-async";
import { formatDate, formatNaira, formatNumber } from "@/lib/format";
import { api } from "@/services";

export function AdminOverviewView() {
  const load = useCallback(() => api.getAdminOverview(), []);
  const { state, reload } = useAsync(load);

  return (
    <AdminPage title="Overview">
      {state.status === "loading" ? <LoadingBlock label="Loading overview" /> : null}
      {state.status === "error" ? <ErrorBlock error={state.error} onRetry={reload} /> : null}
      {state.status === "ready" ? (
        <>
          <div className="grid gap-1.5 md:grid-cols-[520px_272px_272px] md:items-start md:gap-2">
            <div className="flex min-h-[250px] flex-col justify-between bg-mint p-5 text-on-color md:h-[300px] md:p-6">
              <div>
                <p className="text-xl font-medium md:text-[21px]">Verified payments</p>
                <p className="font-display text-[120px] leading-[0.85] tracking-[-0.02em] md:text-[150px]">{formatNaira(state.data.verifiedPaymentsKobo)}</p>
              </div>
              <p className="text-base md:text-lg">Sample figure. Only verified payments count.</p>
            </div>
            <div className="grid grid-cols-2 gap-1.5 md:contents">
              <div className="flex min-h-[200px] flex-col justify-between bg-elevated p-4 md:mt-10 md:h-[240px] md:p-6">
                <p className="font-display text-[96px] leading-[0.85] md:text-[120px]">{formatNumber(state.data.votesCast)}</p>
                <p className="text-lg leading-[1.3]">votes cast this season</p>
              </div>
              <div className="mt-12 flex min-h-[190px] flex-col justify-between bg-orange p-4 text-on-color md:mt-[90px] md:h-[200px] md:p-6">
                <p className="font-display text-[96px] leading-[0.85] md:text-[120px]">{state.data.openFlags}</p>
                <p className="text-lg leading-[1.3]">{state.data.openFlags === 1 ? "flag needs review" : "flags need review"}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-10 md:grid-cols-2 md:gap-5">
            <section aria-labelledby="attention-title" className="flex flex-col gap-5">
              <h2 id="attention-title" className="text-[30px] font-bold leading-[1.1]">
                Needs your attention
              </h2>
              <ul className="flex flex-col gap-4">
                {[
                  { show: state.data.openFlags > 0, title: `${state.data.openFlags} flagged activity ${state.data.openFlags === 1 ? "item" : "items"}`, detail: "Unusual patterns to review", href: "/admin/suspicious", action: "Review" },
                  { show: state.data.pendingPayments > 0, title: `${state.data.pendingPayments} ${state.data.pendingPayments === 1 ? "payment" : "payments"} still pending`, detail: "Waiting on provider verification", href: "/admin/payments", action: "Open payments" },
                  { show: state.data.draftArtists > 0, title: `${state.data.draftArtists} ${state.data.draftArtists === 1 ? "artist is a draft" : "artists are drafts"}`, detail: "Not visible to the public yet", href: "/admin/artists", action: "Open artists" },
                ]
                  .filter((item) => item.show)
                  .map((item) => (
                    <li key={item.href} className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xl font-medium">{item.title}</p>
                        <p className="text-base text-muted">{item.detail}</p>
                      </div>
                      <Link href={item.href} className="shrink-0 text-lg font-semibold underline underline-offset-4">
                        {item.action}
                      </Link>
                    </li>
                  ))}
                {state.data.openFlags + state.data.pendingPayments + state.data.draftArtists === 0 ? <li className="text-xl text-muted">Nothing needs attention right now.</li> : null}
              </ul>
            </section>
            <section aria-labelledby="actions-title" className="flex flex-col gap-5">
              <h2 id="actions-title" className="text-[30px] font-bold leading-[1.1]">
                Recent admin actions
              </h2>
              <ul className="flex flex-col gap-4">
                {state.data.recentActions.map((entry) => (
                  <li key={entry.id}>
                    <p className="text-xl font-medium">{entry.action}</p>
                    <p className="text-base text-muted">
                      {formatDate(entry.createdAt)} &middot; {entry.actor}
                      {entry.reason ? `, reason recorded` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      ) : null}
    </AdminPage>
  );
}
