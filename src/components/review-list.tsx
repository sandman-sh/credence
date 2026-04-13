import {
  formatCurrency,
  formatDate,
  shortenHash,
  shortenWallet,
} from "@/lib/format";
import { Attestation } from "@/lib/types";

export function ReviewList({
  attestations,
  compact = false,
}: {
  attestations: Attestation[];
  compact?: boolean;
}) {
  return (
    <div className="space-y-4">
      {attestations.map((attestation) => (
        <article
          key={attestation.id}
          className="surface-card rounded-[1.4rem] p-5 animate-rise"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="pill">{attestation.taskCategory}</span>
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  {attestation.reviewRating}/5 rating
                </span>
                <span
                  className={
                    attestation.success ? "status-pill-success" : "status-pill-warning"
                  }
                >
                  {attestation.success ? "Success" : "Failed"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                {attestation.comment}
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                <span>Buyer {shortenWallet(attestation.buyerWallet)}</span>
                <span>Receipt {shortenHash(attestation.paymentTxHash)}</span>
                {attestation.verifiedLedger ? <span>Ledger {attestation.verifiedLedger}</span> : null}
              </div>
            </div>
            <div className="metric-card min-w-[14rem] text-sm text-[var(--muted)]">
              <p className="section-label">Commercial value</p>
              <p className="mt-2 font-semibold text-[var(--foreground)]">
                {formatCurrency(attestation.amountPaid)}
              </p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {formatDate(attestation.timestamp)}
              </p>
              {attestation.verifiedAt ? (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Verified {formatDate(attestation.verifiedAt)}
                </p>
              ) : null}
            </div>
          </div>

          {!compact ? (
            <>
              <div className="panel-divider my-4" />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <p className="text-sm leading-7 text-[var(--muted)]">{attestation.taskSummary}</p>
                {attestation.horizonUrl ? (
                  <a
                    href={attestation.horizonUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary px-4 py-2 text-sm"
                  >
                    Open receipt
                  </a>
                ) : null}
              </div>
            </>
          ) : null}
        </article>
      ))}
    </div>
  );
}
