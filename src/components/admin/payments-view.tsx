"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { AdminPage } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TextAreaField } from "@/components/ui/field";
import { ErrorBlock, FilterChip, LoadingBlock, Notice } from "@/components/ui/feedback";
import { useAsync } from "@/hooks/use-async";
import { errorMessage } from "@/lib/error-message";
import { fieldErrors } from "@/lib/form";
import { formatDate, formatNaira } from "@/lib/format";
import { refundSchema } from "@/lib/validation";
import { api } from "@/services";
import type { Payment, PaymentStatus } from "@/types/domain";

const filters: Array<{ key: "all" | PaymentStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "verified", label: "Verified" },
  { key: "pending", label: "Pending" },
  { key: "failed", label: "Failed" },
  { key: "refunded", label: "Refunded" },
];
const word: Record<PaymentStatus, string> = { verified: "Verified", pending: "Pending", failed: "Failed", refunded: "Refunded" };

export function FlagList({ limit }: { limit?: number }) {
  const load = useCallback(() => api.listFlags(), []);
  const { state, reload, refresh } = useAsync(load);
  if (state.status === "loading") return <LoadingBlock label="Loading flags" />;
  if (state.status === "error") return <ErrorBlock error={state.error} onRetry={reload} />;
  const flags = limit ? state.data.slice(0, limit) : state.data;
  if (flags.length === 0) return <p className="text-xl text-muted">No flagged activity.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {flags.map((flag) => (
        <li key={flag.id} className={`flex items-center justify-between gap-4 p-4 ${flag.status === "open" ? "bg-orange text-on-color" : "bg-elevated text-ink"}`}>
          <div>
            <p className="text-xl font-bold leading-[1.25]">{flag.subject}</p>
            <p className="text-lg">
              {flag.detail} {flag.status === "reviewed" ? "Reviewed." : ""}
            </p>
          </div>
          {flag.status === "open" ? (
            <button
              type="button"
              className="shrink-0 text-lg font-bold underline underline-offset-4"
              onClick={async () => {
                await api.reviewFlag(flag.id);
                refresh();
              }}
            >
              Mark reviewed
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function AdminPaymentsView() {
  const load = useCallback(() => api.listAdminPayments(), []);
  const { state, reload, refresh } = useAsync(load);
  const [filter, setFilter] = useState<"all" | PaymentStatus>("all");
  const [refunding, setRefunding] = useState<Payment | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refund() {
    if (!refunding) return;
    const parsed = refundSchema.safeParse({ reason });
    if (!parsed.success) return setError(fieldErrors(parsed.error).reason);
    setError(undefined);
    setBusy(true);
    setProblem(null);
    try {
      await api.issueRefund({ paymentId: refunding.id, reason: parsed.data.reason });
      setNotice(`Refund approved for ${refunding.reference}. It is recorded in the audit log.`);
      setRefunding(null);
      setReason("");
      refresh();
    } catch (e) {
      setProblem(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminPage title="Payments">
      {notice ? <Notice tone="info">{notice}</Notice> : null}
      <div role="group" aria-label="Filter payments" className="flex flex-wrap items-center gap-2">
        <span className="text-xl font-medium">Show:</span>
        {filters.map((f) => (
          <FilterChip key={f.key} selected={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </FilterChip>
        ))}
      </div>

      <div className="grid gap-10 md:grid-cols-[640px_1fr] md:gap-8">
        <section aria-labelledby="pay-title" className="flex flex-col gap-5">
          <h2 id="pay-title" className="text-[30px] font-bold leading-[1.1]">
            Payments
          </h2>
          {state.status === "loading" ? <LoadingBlock label="Loading payments" /> : null}
          {state.status === "error" ? <ErrorBlock error={state.error} onRetry={reload} /> : null}
          {state.status === "ready" ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-lg">
                <thead className="text-base text-muted">
                  <tr>
                    <th scope="col" className="pb-2 font-normal">Reference</th>
                    <th scope="col" className="pb-2 font-normal">Fan</th>
                    <th scope="col" className="pb-2 font-normal">Amount</th>
                    <th scope="col" className="pb-2 font-normal">Status</th>
                    <th scope="col" className="pb-2 font-normal"><span className="sr-only">Action</span></th>
                  </tr>
                </thead>
                <tbody>
                  {state.data
                    .filter((p) => filter === "all" || p.status === filter)
                    .map((p) => (
                      <tr key={p.id}>
                        <td className="py-2 pr-3 font-medium">{p.reference}</td>
                        <td className="py-2 pr-3">{p.fanLabel}</td>
                        <td className="py-2 pr-3 font-semibold">{formatNaira(p.amountKobo)}</td>
                        <td className="py-2 pr-3">{word[p.status]} <span className="text-muted">{formatDate(p.createdAt)}</span></td>
                        <td className="py-2">
                          {p.status === "verified" ? (
                            <button type="button" onClick={() => { setRefunding(p); setReason(""); setError(undefined); setProblem(null); }} className="font-semibold underline underline-offset-4" aria-label={`Issue refund for ${p.reference}`}>
                              Issue refund
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <section aria-labelledby="flags-title" className="flex flex-col gap-5">
          <h2 id="flags-title" className="text-[30px] font-bold leading-[1.1]">
            Suspicious activity
          </h2>
          <FlagList limit={4} />
          <Link href="/admin/suspicious" className="w-fit text-lg font-semibold underline underline-offset-4">
            See all flagged activity
          </Link>
        </section>
      </div>

      <Dialog open={refunding !== null} onClose={() => setRefunding(null)} title="Issue a refund">
        {refunding ? (
          <>
            <div className="flex flex-col gap-1 text-lg">
              <p>
                <span className="text-muted">Payment: </span>
                {refunding.reference} &middot; {formatNaira(refunding.amountKobo)} &middot; {refunding.fanLabel}
              </p>
              <p>
                <span className="text-muted">Refund amount: </span>
                {formatNaira(refunding.amountKobo)}
              </p>
            </div>
            <TextAreaField tone="ground" label="Reason (required)" placeholder="Explain why this refund is approved" value={reason} onChange={(e) => setReason(e.target.value)} error={error} />
            <p className="text-base leading-[1.4] text-muted">This action is recorded in the audit log with your name and the reason. It cannot be undone.</p>
            {problem ? <Notice>{problem}</Notice> : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button size="lg" full disabled={busy} onClick={refund}>
                {busy ? "Refunding\u2026" : "Confirm refund"}
              </Button>
              <Button tone="ground" size="lg" full disabled={busy} onClick={() => setRefunding(null)}>
                Cancel
              </Button>
            </div>
          </>
        ) : null}
      </Dialog>
    </AdminPage>
  );
}

export function AdminSuspiciousView() {
  return (
    <AdminPage title="Suspicious activity">
      <FlagList />
    </AdminPage>
  );
}
