"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ShieldWarning, ClockCountdown, CheckCircle, Gavel, ArrowsClockwise } from "@phosphor-icons/react";
import { useMemo, useState, useTransition } from "react";
import { formatDate, formatNumber, shortenHash, shortenWallet } from "@/lib/format";
import { AgentSnapshot, Dispute } from "@/lib/types";

const disputeReasons = [
  "Delivery did not match the attested result",
  "Payment receipt needs manual review",
  "Buyer review appears misleading",
  "Potential abuse or wash activity",
] as const;

const statusOptions: Dispute["status"][] = ["open", "reviewed", "resolved"];

function statusPillClass(status: Dispute["status"]) {
  if (status === "resolved") {
    return "status-pill-success";
  }

  if (status === "reviewed") {
    return "status-pill-progress";
  }

  return "status-pill-warning";
}

export function DisputeDesk({
  verifierAgent,
  initialDisputes,
}: {
  verifierAgent: AgentSnapshot | null;
  initialDisputes: Dispute[];
}) {
  const prefersReducedMotion = useReducedMotion();
  const [disputes, setDisputes] = useState<Dispute[]>(initialDisputes);
  const [loading, setLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelNotice, setPanelNotice] = useState<string | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const availableAttestations = verifierAgent?.recentAttestations ?? [];
  const [form, setForm] = useState<{
    paymentTxHash: string;
    openedByWallet: string;
    reason: string;
    details: string;
  }>({
    paymentTxHash: availableAttestations[0]?.paymentTxHash ?? "",
    openedByWallet: availableAttestations[0]?.buyerWallet ?? "",
    reason: disputeReasons[0],
    details:
      "Please review this attestation and compare the paid receipt, delivery quality, and buyer review.",
  });

  const agentPaymentHashes = useMemo(
    () => new Set(verifierAgent?.recentAttestations.map((item) => item.paymentTxHash) ?? []),
    [verifierAgent],
  );

  const visibleDisputes = useMemo(
    () =>
      verifierAgent
        ? disputes.filter((item) => agentPaymentHashes.has(item.paymentTxHash))
        : disputes,
    [agentPaymentHashes, disputes, verifierAgent],
  );

  const disputeCounts = useMemo(
    () => ({
      open: disputes.filter((item) => item.status === "open").length,
      reviewed: disputes.filter((item) => item.status === "reviewed").length,
      resolved: disputes.filter((item) => item.status === "resolved").length,
    }),
    [disputes],
  );

  async function loadDisputes() {
    setLoading(true);
    setPanelError(null);

    const response = await fetch("/api/disputes", { cache: "no-store" });
    const data = await response.json();

    setLoading(false);

    if (!response.ok) {
      setPanelError(data.error ?? "Unable to load disputes.");
      return;
    }

    setDisputes((data.disputes ?? []) as Dispute[]);
  }

  async function updateStatus(id: string, status: Dispute["status"]) {
    setActiveActionId(id);
    setPanelError(null);
    setPanelNotice(null);

    const response = await fetch("/api/disputes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = await response.json();

    setActiveActionId(null);

    if (!response.ok) {
      setPanelError(data.error ?? "Unable to update dispute.");
      return;
    }

    const updated = data.dispute as Dispute;
    setDisputes((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
    setPanelNotice(`Dispute marked ${updated.status}.`);
  }

  function openDispute() {
    setPanelError(null);
    setPanelNotice(null);

    startSubmitTransition(async () => {
      const response = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        setPanelError(data.error ?? "Unable to open dispute.");
        return;
      }

      const dispute = data.dispute as Dispute;
      setDisputes((current) => [dispute, ...current]);
      setPanelNotice("Dispute opened and added to the review queue.");
    });
  }

  return (
    <motion.section
      id="dispute-desk"
      className="surface-card rounded-[1.8rem] p-6"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ duration: 0.45, delay: 0.12 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-[rgba(253,224,71,0.18)] bg-[rgba(253,224,71,0.12)] p-3 text-[var(--gold)]">
            <ShieldWarning size={20} weight="duotone" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Dispute desk</p>
            <p className="mt-1 text-sm leading-7 text-[var(--muted)]">
              A compact admin surface for contesting attestations, reviewing cases,
              and marking outcomes as they move through manual review.
            </p>
          </div>
        </div>
        <motion.button
          type="button"
          onClick={loadDisputes}
          className="btn-secondary"
          whileHover={prefersReducedMotion ? undefined : { y: -2 }}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
        >
          <ArrowsClockwise size={16} weight="bold" />
          Refresh
        </motion.button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="metric-card">
          <p className="section-label flex items-center gap-2">
            <ClockCountdown size={14} weight="duotone" />
            Open
          </p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
            {formatNumber(disputeCounts.open)}
          </p>
        </div>
        <div className="metric-card">
          <p className="section-label flex items-center gap-2">
            <Gavel size={14} weight="duotone" />
            Reviewed
          </p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
            {formatNumber(disputeCounts.reviewed)}
          </p>
        </div>
        <div className="metric-card">
          <p className="section-label flex items-center gap-2">
            <CheckCircle size={14} weight="duotone" />
            Resolved
          </p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
            {formatNumber(disputeCounts.resolved)}
          </p>
        </div>
      </div>

      <div className="surface-card-tint mt-5 rounded-[1.5rem] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="section-label">Open a case</p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              Start a manual review against a payment-backed attestation. When an
              agent is selected, the form prioritizes that agent&apos;s recent receipts.
            </p>
          </div>
          {verifierAgent ? (
            <div className="rounded-[1.2rem] border border-[rgba(167,139,250,0.16)] bg-[rgba(11,11,17,0.92)] px-4 py-3 text-sm text-[var(--foreground)]">
              Reviewing {verifierAgent.name}
            </div>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4">
          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Payment receipt
            </span>
            <select
              className="input-shell font-mono text-sm"
              value={form.paymentTxHash}
              onChange={(event) => {
                const paymentTxHash = event.target.value;
                const selectedAttestation = availableAttestations.find(
                  (item) => item.paymentTxHash === paymentTxHash,
                );

                setForm((current) => ({
                  ...current,
                  paymentTxHash,
                  openedByWallet:
                    selectedAttestation?.buyerWallet ?? current.openedByWallet,
                }));
              }}
            >
              {availableAttestations.length === 0 ? (
                <option value="">Paste a payment hash after selecting an agent</option>
              ) : null}
              {availableAttestations.map((attestation) => (
                <option key={attestation.id} value={attestation.paymentTxHash}>
                  {shortenHash(attestation.paymentTxHash)} · {attestation.taskCategory} ·{" "}
                  {attestation.reviewRating}/5
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--foreground)]">
                Opened by wallet
              </span>
              <input
                className="input-shell font-mono text-sm"
                value={form.openedByWallet}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    openedByWallet: event.target.value,
                  }))
                }
                placeholder="Buyer or agent wallet"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--foreground)]">
                Reason
              </span>
              <select
                className="input-shell"
                value={form.reason}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
              >
                {disputeReasons.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Review notes
            </span>
            <textarea
              className="input-shell min-h-[112px]"
              value={form.details}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  details: event.target.value,
                }))
              }
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <motion.button
              type="button"
              onClick={openDispute}
              disabled={
                isSubmitting ||
                !form.paymentTxHash.trim() ||
                !form.openedByWallet.trim() ||
                !form.reason.trim() ||
                !form.details.trim()
              }
              className="btn-dark"
              whileHover={prefersReducedMotion ? undefined : { y: -2 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
            >
              {isSubmitting ? "Opening..." : "Open dispute"}
            </motion.button>
            <p className="self-center text-sm text-[var(--muted)]">
              Only the buyer or agent wallet tied to the attestation can open a case.
            </p>
          </div>
        </div>
      </div>

      {panelError ? (
        <p className="alert-error mt-4">
          {panelError}
        </p>
      ) : null}

      {panelNotice ? (
        <p className="alert-success mt-4">
          {panelNotice}
        </p>
      ) : null}

      <div className="mt-5 rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-tint)] p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-label">Recent cases</p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              {verifierAgent
                ? `Showing disputes linked to ${verifierAgent.name}.`
                : "Showing disputes across the indexed network."}
            </p>
          </div>
          <p className="text-sm text-[var(--muted)]">
            {loading ? "Loading..." : `${visibleDisputes.length} visible cases`}
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {visibleDisputes.length === 0 ? (
            <div className="rounded-[1.3rem] border border-dashed border-[rgba(167,139,250,0.18)] bg-[rgba(17,17,24,0.6)] px-4 py-5 text-sm text-[var(--muted)]">
              No disputes are currently visible for this scope.
            </div>
          ) : (
            visibleDisputes.slice(0, 5).map((dispute) => (
              <div
                key={dispute.id}
                className="rounded-[1.3rem] border border-[rgba(167,139,250,0.12)] bg-[rgba(14,14,21,0.9)] px-4 py-4 shadow-[0_22px_44px_rgba(0,0,0,0.26)]"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusPillClass(dispute.status)}`}
                      >
                        {dispute.status}
                      </span>
                      <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                        {formatDate(dispute.createdAt)}
                      </span>
                    </div>
                    <p className="mt-3 text-base font-semibold text-[var(--foreground)]">
                      {dispute.reason}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      {dispute.details}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--muted)]">
                      <span>Receipt {shortenHash(dispute.paymentTxHash)}</span>
                      <span>Opened by {shortenWallet(dispute.openedByWallet)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {statusOptions.map((status) => (
                      <motion.button
                        key={status}
                        type="button"
                        onClick={() => updateStatus(dispute.id, status)}
                        disabled={activeActionId === dispute.id || dispute.status === status}
                        className={status === "resolved" ? "btn-primary" : "btn-secondary"}
                        whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                        whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                      >
                        {activeActionId === dispute.id && dispute.status !== status
                          ? "Saving..."
                          : status}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.section>
  );
}
