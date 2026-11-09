"use client";

import { useCallback, useState } from "react";

import { AdminPage } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { ErrorBlock, LoadingBlock, Notice } from "@/components/ui/feedback";
import { useAsync } from "@/hooks/use-async";
import { errorMessage } from "@/lib/error-message";
import { formatDate, formatNumber } from "@/lib/format";
import { api } from "@/services";
import type { ReportKind } from "@/types/domain";

const reports: Array<{ kind: ReportKind; label: string }> = [
  { kind: "payments", label: "Payments report (CSV)" },
  { kind: "votes", label: "Votes report (CSV)" },
  { kind: "audit", label: "Audit log (CSV)" },
];

export function AdminWinnersView() {
  const load = useCallback(async () => {
    const [winners, season] = await Promise.all([api.listAdminWinners(), api.getAdminSeason()]);
    return { winners, season: season.season };
  }, []);
  const { state, reload, refresh } = useAsync(load);
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  async function download(kind: ReportKind) {
    try {
      const csv = await api.exportReport(kind);
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `blog-award-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage({ tone: "info", text: `${kind} report downloaded.` });
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error) });
    }
  }

  async function publish(categoryId: string) {
    try {
      const winner = await api.publishWinner(categoryId);
      setMessage({ tone: "info", text: `Published: ${winner.artistName} for ${winner.categoryName}.` });
      refresh();
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error) });
    }
  }

  return (
    <AdminPage title="Winners">
      {state.status === "loading" ? <LoadingBlock label="Loading winners" /> : null}
      {state.status === "error" ? <ErrorBlock error={state.error} onRetry={reload} /> : null}
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      {state.status === "ready" ? (
        <>
          {state.data.season.votingStatus === "open" ? (
            <div className="bg-grey p-5 text-xl font-medium leading-[1.35] text-on-color md:px-6">
              Winners can be published only after voting closes. Voting is open now, so publishing is locked.
            </div>
          ) : null}
          <div className="grid gap-8 md:grid-cols-[620px_436px] md:items-start md:gap-6">
            <section aria-labelledby="w-title" className="flex flex-col gap-5">
              <h2 id="w-title" className="text-[30px] font-bold leading-[1.1]">
                Winners by category
              </h2>
              <ul className="flex flex-col gap-5">
                {state.data.winners.map((winner) => {
                  const locked = state.data.season.votingStatus === "open";
                  return (
                    <li key={winner.categoryId} className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-lg text-muted">{winner.categoryName}</p>
                        <p className="text-[22px] font-medium leading-[1.25]">
                          {winner.artistName} &middot; {formatNumber(winner.votes)} votes
                        </p>
                        {winner.publishedAt ? <p className="text-base font-semibold">Published {formatDate(winner.publishedAt)}</p> : null}
                      </div>
                      {winner.publishedAt ? null : locked ? (
                        <span className="bg-elevated px-4 py-3 text-[17px] font-semibold text-muted">Locked until voting closes</span>
                      ) : (
                        <Button size="sm" onClick={() => publish(winner.categoryId)}>
                          Publish winner
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
            <section aria-labelledby="r-title" className="flex flex-col gap-4 bg-elevated p-5 md:p-7">
              <h2 id="r-title" className="text-[30px] font-bold leading-[1.1]">
                Export reports
              </h2>
              {reports.map((report) => (
                <div key={report.kind} className="flex items-center justify-between gap-3">
                  <span className="text-xl font-medium">{report.label}</span>
                  <Button size="sm" onClick={() => download(report.kind)} aria-label={`Export ${report.label}`}>
                    Export
                  </Button>
                </div>
              ))}
              <p className="text-base leading-[1.4] text-muted">Only permitted reports are available. Exports never include passwords, secret keys or card data.</p>
            </section>
          </div>
        </>
      ) : null}
    </AdminPage>
  );
}
