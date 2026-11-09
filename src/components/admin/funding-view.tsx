"use client";

import { useCallback, useState } from "react";

import { AdminPage } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, TextAreaField } from "@/components/ui/field";
import { ErrorBlock, FilterChip, LoadingBlock, Notice } from "@/components/ui/feedback";
import { useAsync } from "@/hooks/use-async";
import { errorMessage } from "@/lib/error-message";
import { formatDateTime, formatNumber } from "@/lib/format";
import { api } from "@/services";
import type { FundingRequest, FundingRequestStatus } from "@/types/domain";

const filterOptions: Array<{ key: "all" | FundingRequestStatus; label: string }> = [
  { key: "all", label: "All Requests" },
  { key: "pending_verification", label: "Pending Verification" },
  { key: "awaiting_payment", label: "Awaiting Payment" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const statusStyles: Record<FundingRequestStatus, { label: string; badgeClass: string }> = {
  pending_verification: { label: "Pending Verification", badgeClass: "bg-orange text-on-color animate-pulse" },
  awaiting_payment: { label: "Awaiting Payment", badgeClass: "bg-ground text-muted" },
  approved: { label: "Approved", badgeClass: "bg-mint text-on-color" },
  rejected: { label: "Rejected", badgeClass: "bg-red-600 text-white" },
  expired: { label: "Expired", badgeClass: "bg-ground text-muted" },
};

export function AdminFundingView() {
  const loadData = useCallback(async () => {
    const [overview, requests] = await Promise.all([
      api.getAdminFundingOverview(),
      api.listAdminFundingRequests(),
    ]);
    return { overview, requests };
  }, []);

  const { state, reload, refresh } = useAsync(loadData);

  const [filter, setFilter] = useState<"all" | FundingRequestStatus>("all");
  const [search, setSearch] = useState("");

  // Verification & Approval state
  const [selectedRequest, setSelectedRequest] = useState<FundingRequest | null>(null);
  const [actualAmountText, setActualAmountText] = useState("");
  const [actualAmountError, setActualAmountError] = useState<string | undefined>();

  // Rejection state
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState<string | undefined>();

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [notificationState, setNotificationState] = useState<string>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "default";
  });

  function enableNotifications() {
    if (typeof window !== "undefined" && "Notification" in window) {
      Notification.requestPermission().then((perm) => {
        setNotificationState(perm);
        if (perm === "granted") {
          new Notification("Desktop Push Alerts Enabled", {
            body: "You will receive instant alerts whenever a user notifies an OPay payment.",
          });
        }
      });
    }
  }

  function openVerification(req: FundingRequest) {
    setSelectedRequest(req);
    setActualAmountText(String(req.requestedAmountNaira));
    setActualAmountError(undefined);
    setIsRejecting(false);
    setRejectionReason("");
    setRejectionError(undefined);
    setActionError(null);
  }

  function closeDialog() {
    setSelectedRequest(null);
    setIsRejecting(false);
    setActionError(null);
  }

  // Live computed points for approval
  const actualAmountNum = Number(actualAmountText.trim());
  const calculatedPoints =
    selectedRequest && Number.isFinite(actualAmountNum) && actualAmountNum > 0
      ? Math.floor(actualAmountNum / (selectedRequest.conversionRate || 50))
      : 0;

  async function handleApprove() {
    if (!selectedRequest) return;
    if (!Number.isFinite(actualAmountNum) || actualAmountNum <= 0) {
      setActualAmountError("Please enter a valid amount received in Naira (greater than 0).");
      return;
    }
    setActualAmountError(undefined);
    setBusy(true);
    setActionError(null);

    try {
      await api.approveFundingRequest({
        requestId: selectedRequest.id,
        actualAmountNaira: actualAmountNum,
      });
      setNotice(`Approved payment ${selectedRequest.reference}! Credited ${calculatedPoints} points to user.`);
      closeDialog();
      refresh();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!selectedRequest) return;
    const trimmed = rejectionReason.trim();
    if (trimmed.length < 3) {
      setRejectionError("Please provide a rejection reason (minimum 3 characters).");
      return;
    }
    setRejectionError(undefined);
    setBusy(true);
    setActionError(null);

    try {
      await api.rejectFundingRequest({
        requestId: selectedRequest.id,
        reason: trimmed,
      });
      setNotice(`Rejected request ${selectedRequest.reference}. Reason recorded in audit log.`);
      closeDialog();
      refresh();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (state.status === "loading") return <LoadingBlock label="Loading wallet funding management" />;
  if (state.status === "error") return <ErrorBlock error={state.error} onRetry={reload} />;

  const { overview, requests } = state.data;

  // Filter and search
  const filteredRequests = requests.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const refMatch = r.reference.toLowerCase().includes(q);
      const userMatch = r.userId.toLowerCase().includes(q);
      const labelMatch = r.fanLabel.toLowerCase().includes(q);
      if (!refMatch && !userMatch && !labelMatch) return false;
    }
    return true;
  });

  return (
    <AdminPage title="Wallet Funding Management">
      {notice ? <Notice tone="info">{notice}</Notice> : null}

      {notificationState !== "granted" ? (
        <div className="flex flex-col gap-2 rounded bg-gold/15 border border-gold p-4 text-base sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold">Enable Desktop Payment Alerts</p>
            <p className="text-sm text-muted">Get notified on your device the moment a user submits an OPay payment notification.</p>
          </div>
          <button
            type="button"
            onClick={enableNotifications}
            className="w-fit rounded bg-gold px-4 py-2 text-sm font-bold text-on-color transition hover:opacity-90"
          >
            Turn On Alerts
          </button>
        </div>
      ) : null}

      {/* Overview Cards */}
      <section aria-label="Funding overview metrics" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="bg-elevated p-4">
          <p className="text-base text-muted">Pending Verification</p>
          <p className={`font-display text-4xl leading-tight ${overview.pendingCount > 0 ? "text-orange font-bold" : "text-ink"}`}>
            {overview.pendingCount}
          </p>
        </div>
        <div className="bg-elevated p-4">
          <p className="text-base text-muted">Total Approved</p>
          <p className="font-display text-4xl leading-tight text-mint font-bold">
            {overview.approvedCount}
          </p>
        </div>
        <div className="bg-elevated p-4">
          <p className="text-base text-muted">Total Rejected</p>
          <p className="font-display text-4xl leading-tight text-muted">
            {overview.rejectedCount}
          </p>
        </div>
        <div className="bg-elevated p-4">
          <p className="text-base text-muted">Total Points Credited</p>
          <p className="font-display text-4xl leading-tight text-ink">
            {formatNumber(overview.totalPointsCredited)}
          </p>
        </div>
        <div className="col-span-2 bg-elevated p-4 sm:col-span-1">
          <p className="text-base text-muted">Total Naira Received</p>
          <p className="font-display text-4xl leading-tight text-ink">
            ₦{formatNumber(overview.totalNairaReceived)}
          </p>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Filter funding requests" className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-medium">Show:</span>
          {filterOptions.map((f) => (
            <FilterChip
              key={f.key}
              selected={filter === f.key}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              {f.key === "pending_verification" && overview.pendingCount > 0 ? (
                <span className="ml-1.5 rounded-full bg-orange px-1.5 py-0.2 text-xs text-white">
                  {overview.pendingCount}
                </span>
              ) : null}
            </FilterChip>
          ))}
        </div>

        <div className="w-full sm:w-72">
          <input
            type="search"
            placeholder="Search Reference or User ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-border bg-ground px-3 py-2 text-base outline-none focus:border-gold"
          />
        </div>
      </div>

      {/* Requests Table */}
      <section aria-labelledby="requests-table-title" className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 id="requests-table-title" className="text-2xl font-bold">
            Funding Requests ({filteredRequests.length})
          </h2>
          <button
            type="button"
            onClick={() => refresh()}
            className="text-base font-semibold underline underline-offset-4 text-muted hover:text-ink"
          >
            Refresh
          </button>
        </div>

        {filteredRequests.length === 0 ? (
          <p className="text-xl text-muted py-6">No funding requests match the current filters.</p>
        ) : (
          <div className="overflow-x-auto border border-border bg-elevated">
            <table className="w-full min-w-[700px] text-left text-base">
              <thead className="bg-ground text-sm uppercase tracking-wider text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Reference</th>
                  <th scope="col" className="px-4 py-3 font-semibold">User</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Requested (₦)</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Points</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Date</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRequests.map((req) => {
                  const badge = statusStyles[req.status] || { label: req.status, badgeClass: "bg-surface-sunken" };
                  const isPending = req.status === "pending_verification";
                  return (
                    <tr key={req.id} className={isPending ? "bg-orange/5" : undefined}>
                      <td className="px-4 py-3 font-mono font-medium text-ink">
                        {req.reference}
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-semibold">{req.fanLabel}</span>
                        <span className="block font-mono text-xs text-muted" title={req.userId}>
                          {req.userId.slice(0, 8)}…
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        ₦{formatNumber(req.actualAmountNaira ?? req.requestedAmountNaira)}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatNumber(req.creditedPoints ?? req.expectedPoints)} pts
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">
                        {formatDateTime(req.submittedAt ?? req.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${badge.badgeClass}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {req.status === "pending_verification" || req.status === "awaiting_payment" ? (
                          <button
                            type="button"
                            onClick={() => openVerification(req)}
                            className="bg-gold px-3 py-1 text-sm font-bold text-on-color transition hover:opacity-90"
                          >
                            Verify & Credit
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openVerification(req)}
                            className="text-sm font-semibold underline underline-offset-4 text-muted hover:text-ink"
                          >
                            Inspect
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Verification & Approval Dialog */}
      <Dialog
        open={selectedRequest !== null}
        onClose={closeDialog}
        title={isRejecting ? "Reject Funding Request" : "Verify & Approve Payment"}
      >
        {selectedRequest ? (
          <div className="flex flex-col gap-5 text-ink">
            {/* Request Summary Info */}
            <div className="grid grid-cols-2 gap-3 bg-ground p-4 text-base">
              <div>
                <span className="block text-xs uppercase tracking-wider text-muted">User</span>
                <span className="font-bold">{selectedRequest.fanLabel}</span>
                <span className="block font-mono text-xs text-muted">{selectedRequest.userId}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-muted">Payment Reference</span>
                <span className="font-mono text-lg font-bold">{selectedRequest.reference}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-muted">Requested Amount</span>
                <span className="font-bold">₦{formatNumber(selectedRequest.requestedAmountNaira)}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-muted">Expected Points</span>
                <span className="font-bold text-mint">{selectedRequest.expectedPoints} Points</span>
              </div>
              <div className="col-span-2 border-t border-border pt-2 text-sm text-muted">
                Submitted: {formatDateTime(selectedRequest.submittedAt ?? selectedRequest.createdAt)} &middot; Status:{" "}
                <span className="font-bold uppercase">{selectedRequest.status}</span>
              </div>
            </div>

            {actionError ? <Notice tone="error">{actionError}</Notice> : null}

            {/* Approval Mode */}
            {!isRejecting ? (
              <>
                {selectedRequest.status !== "approved" ? (
                  <div className="flex flex-col gap-4">
                    <Field
                      tone="ground"
                      label="Enter Actual Amount Received (₦)"
                      inputMode="numeric"
                      placeholder="e.g. 1500"
                      value={actualAmountText}
                      onChange={(e) => {
                        setActualAmountText(e.target.value);
                        setActualAmountError(undefined);
                      }}
                      error={actualAmountError}
                      hint="Check your OPay transaction history and enter the exact Naira amount received."
                    />

                    {/* Calculated Points Display */}
                    <div className="flex items-center justify-between bg-mint/15 border border-mint p-4 text-lg">
                      <span className="font-medium text-ink">Points to Credit:</span>
                      <span className="text-2xl font-bold text-ink">
                        {calculatedPoints} Points
                      </span>
                    </div>

                    <p className="text-sm text-muted">
                      Conversion rate: ₦{selectedRequest.conversionRate || 50} = 1 Point. Calculated as: Actual Amount / {selectedRequest.conversionRate || 50}.
                    </p>

                    <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                      <Button size="lg" full disabled={busy || calculatedPoints <= 0} onClick={handleApprove}>
                        {busy ? "Processing\u2026" : "Approve & Credit Points"}
                      </Button>
                      <Button tone="ground" size="lg" full disabled={busy} onClick={() => setIsRejecting(true)}>
                        Reject Request
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Notice tone="info">
                      This request was approved on {formatDateTime(selectedRequest.approvedAt ?? "")}. Credited:{" "}
                      <strong>{selectedRequest.creditedPoints} Points</strong> for ₦{formatNumber(selectedRequest.actualAmountNaira ?? 0)}.
                    </Notice>
                    <Button tone="ground" size="lg" onClick={closeDialog}>
                      Close
                    </Button>
                  </div>
                )}
              </>
            ) : (
              /* Rejection Mode */
              <div className="flex flex-col gap-4">
                <TextAreaField
                  tone="ground"
                  label="Rejection Reason (required)"
                  placeholder="Explain why this transfer was rejected (e.g. Reference not found in OPay history, underpaid, wrong account)"
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    setRejectionError(undefined);
                  }}
                  error={rejectionError}
                />
                <p className="text-sm text-muted">
                  This reason will be visible to the user and permanently recorded in the administrative audit log.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button size="lg" full disabled={busy} onClick={handleReject}>
                    {busy ? "Rejecting\u2026" : "Confirm Rejection"}
                  </Button>
                  <Button tone="ground" size="lg" full disabled={busy} onClick={() => setIsRejecting(false)}>
                    Back
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Dialog>
    </AdminPage>
  );
}
