"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState, useTransition } from "react";
import {
  ArrowRight,
  CheckCircle,
  SealCheck,
  ShieldCheck,
  Sparkle,
  Wallet,
} from "@phosphor-icons/react";
import { NetworkOpsPanel } from "@/components/network-ops-panel";
import { useWallet } from "@/components/wallet-provider";
import { formatCurrency, formatDate, shortenWallet } from "@/lib/format";
import { signFreighterTransaction } from "@/lib/freighter";
import {
  AgentSnapshot,
  Dispute,
  MarketplaceSnapshot,
  PaidTaskJob,
  PreparedAttestationEnvelope,
  ReviewRequest,
  TaskCategory,
  TestnetNetworkSummary,
  taskCategories,
} from "@/lib/types";

type TaskStudioProps = {
  agents: AgentSnapshot[];
  initialNetworkSummary: TestnetNetworkSummary;
  initialDisputes: Dispute[];
  onMarketplaceUpdate: (snapshot: MarketplaceSnapshot) => void;
};

export function TaskStudio({
  agents,
  initialNetworkSummary,
  initialDisputes,
  onMarketplaceUpdate,
}: TaskStudioProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isPending, startTransition] = useTransition();
  const [reviewPending, startReviewTransition] = useTransition();
  const [taskError, setTaskError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [job, setJob] = useState<PaidTaskJob | null>(null);
  const [reviewDone, setReviewDone] = useState(false);
  const [verifierAgent, setVerifierAgent] = useState<AgentSnapshot | null>(
    agents[0] ?? null,
  );
  const {
    connectedWallet,
    walletPending,
    walletError,
    connectWallet,
    clearWalletError,
  } = useWallet();

  const [taskForm, setTaskForm] = useState({
    agentId: agents[0]?.id ?? "",
    buyerWallet: "",
    paymentTxHash: "",
    taskCategory: "research" as TaskCategory,
    amountPaid: "2.50",
    prompt:
      "Analyze the strongest trust advantages of receipt-backed attestations for AI agents.",
  });

  const [reviewForm, setReviewForm] = useState<
    Omit<
      ReviewRequest,
      "agentId" | "buyerWallet" | "reviewNonce" | "paymentTxHash" | "taskCategory"
    >
  >({
    success: true,
    reviewRating: 5,
    comment:
      "Verification passed, the delivery matched the paid request, and the result was ready to use.",
  });

  const selectedAgent =
    agents.find((agent) => agent.id === taskForm.agentId) ?? agents[0] ?? null;
  const resolvedBuyerWallet = connectedWallet || taskForm.buyerWallet.trim();

  async function runPaidTask() {
    setTaskError(null);
    setReviewDone(false);
    clearWalletError();

    startTransition(async () => {
      const response = await fetch("/api/x402/task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-stellar-buyer-wallet": resolvedBuyerWallet,
          "x-stellar-payment-tx-hash": taskForm.paymentTxHash,
        },
        body: JSON.stringify({
          ...taskForm,
          buyerWallet: resolvedBuyerWallet,
          agentWallet: selectedAgent?.wallet ?? "",
          amountPaid: Number(taskForm.amountPaid),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setJob(null);
        setTaskError(data.error ?? "Unable to run the paid task.");
        return;
      }

      setJob(data.job as PaidTaskJob);
      setTaskError(null);
    });
  }

  async function submitReview() {
    if (!job) return;
    setReviewError(null);

    startReviewTransition(async () => {
      if (!connectedWallet) {
        setReviewError("Connect the buyer wallet before issuing the attestation.");
        return;
      }

      if (connectedWallet !== job.buyerWallet) {
        setReviewError("The connected wallet must match the verified buyer wallet.");
        return;
      }

      const reviewPayload = {
        agentId: job.agentId,
        buyerWallet: job.buyerWallet,
        reviewNonce: job.reviewNonce,
        paymentTxHash: job.paymentTxHash,
        taskCategory: job.taskCategory,
        ...reviewForm,
      };

      const prepareResponse = await fetch("/api/reviews/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewPayload),
      });
      const prepareData = await prepareResponse.json();

      if (!prepareResponse.ok) {
        setReviewError(prepareData.error ?? "Unable to prepare attestation.");
        return;
      }

      const envelope = prepareData.envelope as PreparedAttestationEnvelope;

      try {
        const signed = await signFreighterTransaction(
          envelope.transactionXdr,
          connectedWallet,
        );

        const submitResponse = await fetch("/api/reviews/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...reviewPayload,
            signerWallet: signed.signerAddress,
            signedTransactionXdr: signed.signedTxXdr,
          }),
        });
        const submitData = await submitResponse.json();

        if (!submitResponse.ok) {
          setReviewError(submitData.error ?? "Unable to submit review.");
          return;
        }

        onMarketplaceUpdate(submitData.marketplace as MarketplaceSnapshot);
        setVerifierAgent(submitData.agent as AgentSnapshot);
        setReviewDone(true);
        setReviewError(null);
        setTaskForm((current) => ({
          ...current,
          paymentTxHash: "",
        }));
      } catch (error) {
        setReviewError(
          error instanceof Error
            ? error.message
            : "Unable to sign the attestation transaction.",
        );
      }
    });
  }

  return (
    <div id="workspace" className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
      <motion.section
        className="surface-card-strong rounded-[2rem] p-6 sm:p-8"
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.45 }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="eyebrow">
              <ShieldCheck size={16} weight="duotone" />
              Verification workspace
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
              Turn a real Stellar testnet receipt into a reviewed attestation
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              This flow checks a live buyer wallet and transaction hash before it
              records a review. No successful receipt, no trust update.
            </p>
          </div>

          <div className="surface-card-tint rounded-[1.4rem] p-4 sm:min-w-[18rem]">
            <p className="section-label">Verification rules</p>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
              <li>Buyer wallet must be a valid Stellar public key.</li>
              <li>Transaction hash must resolve on testnet and be successful.</li>
              <li>One transaction can only back one attestation.</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="surface-card-tint rounded-[1.5rem] p-5">
            <p className="section-label">Step 1</p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
              Choose the agent and work type
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Pick the profile you want to hire and set the category that should
              receive the reputation update.
            </p>
          </div>
          <div className="surface-card-tint rounded-[1.5rem] p-5">
            <p className="section-label">Step 2</p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
              Submit the buyer wallet and receipt
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Credence verifies the transaction against Horizon before allowing the
              task to move into review.
            </p>
          </div>
          <div className="surface-card-tint rounded-[1.5rem] p-5">
            <p className="section-label">Step 3</p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
              Finalize with the buyer review
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              The attestation becomes part of the agent record only after the buyer
              confirms the outcome and rating.
            </p>
          </div>
        </div>

        {selectedAgent ? (
          <div className="mt-8 surface-card-dark rounded-[1.8rem] p-5 text-white">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="section-label section-label-dark">Selected agent</p>
                <h3 className="mt-2 text-2xl font-semibold">{selectedAgent.name}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
                  {selectedAgent.headline}
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-100">
                Base rate {formatCurrency(selectedAgent.baseRateUsd)} / task
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="surface-card-tint rounded-[1.5rem] p-5 md:col-span-2">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="section-label">Buyer wallet</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Connect Freighter on Stellar testnet to sign the Soroban
                  attestation after the payment receipt is verified.
                </p>
              </div>
              <motion.button
                type="button"
                onClick={() => {
                  clearWalletError();
                  void connectWallet().catch(() => undefined);
                }}
                disabled={walletPending}
                className="btn-secondary"
                whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
              >
                <Wallet size={16} weight="duotone" />
                {walletPending
                  ? "Connecting..."
                  : connectedWallet
                    ? "Reconnect wallet"
                    : "Connect Freighter"}
              </motion.button>
            </div>

            {connectedWallet ? (
              <div className="alert-info mt-4 text-sm">
                Connected buyer wallet:{" "}
                <span className="font-mono text-xs text-[var(--muted-strong)]">
                  {connectedWallet}
                </span>
              </div>
            ) : null}

            {walletError ? (
              <p className="alert-error mt-4">
                {walletError}
              </p>
            ) : null}
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">Agent</span>
            <select
              className="input-shell"
              value={taskForm.agentId}
              onChange={(event) => {
                const nextAgentId = event.target.value;
                setTaskForm((current) => ({
                  ...current,
                  agentId: nextAgentId,
                }));
                setVerifierAgent(
                  agents.find((agent) => agent.id === nextAgentId) ?? null,
                );
              }}
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Task category
            </span>
            <select
              className="input-shell"
              value={taskForm.taskCategory}
              onChange={(event) =>
                setTaskForm((current) => ({
                  ...current,
                  taskCategory: event.target.value as TaskCategory,
                }))
              }
            >
              {taskCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Buyer wallet
            </span>
            <input
              className="input-shell font-mono text-sm"
              placeholder="G..."
              disabled={Boolean(connectedWallet)}
              readOnly={Boolean(connectedWallet)}
              value={connectedWallet || taskForm.buyerWallet}
              onChange={(event) =>
                setTaskForm((current) => ({
                  ...current,
                  buyerWallet: event.target.value,
                }))
              }
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Testnet transaction hash
            </span>
            <input
              className="input-shell font-mono text-sm"
              placeholder="Paste a successful Stellar testnet transaction hash"
              value={taskForm.paymentTxHash}
              onChange={(event) =>
                setTaskForm((current) => ({
                  ...current,
                  paymentTxHash: event.target.value,
                }))
              }
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Commercial amount
            </span>
            <input
              className="input-shell"
              type="number"
              min="0.1"
              step="0.1"
              value={taskForm.amountPaid}
              onChange={(event) =>
                setTaskForm((current) => ({
                  ...current,
                  amountPaid: event.target.value,
                }))
              }
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Task request
            </span>
            <textarea
              className="input-shell min-h-[132px]"
              value={taskForm.prompt}
              onChange={(event) =>
                setTaskForm((current) => ({
                  ...current,
                  prompt: event.target.value,
                }))
              }
            />
          </label>
        </div>

        {taskError ? (
          <p className="alert-error mt-5">
            {taskError}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <motion.button
            type="button"
            onClick={runPaidTask}
            disabled={isPending}
            className="btn-primary"
            whileHover={prefersReducedMotion ? undefined : { y: -2, scale: 1.01 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
          >
            <Sparkle size={16} weight="fill" />
            {isPending ? "Verifying payment..." : "Verify payment and run task"}
          </motion.button>
          <p className="self-center text-sm text-[var(--muted)]">
            The request is rejected unless the receipt belongs to the provided buyer wallet.
          </p>
        </div>

        {job ? (
          <motion.div
            className="cosmic-success-shell mt-8 rounded-[1.8rem] border border-[rgba(167,139,250,0.16)] bg-[rgba(17,17,24,0.92)] p-5 sm:p-6"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32 }}
          >
            {reviewDone ? (
              <div className="particle-burst" aria-hidden="true">
                <span style={{ left: "22%", top: "18%", ["--x" as string]: "-1.8rem", ["--y" as string]: "-2.4rem" }} />
                <span style={{ left: "31%", top: "12%", ["--x" as string]: "1.6rem", ["--y" as string]: "-2.8rem" }} />
                <span style={{ left: "48%", top: "16%", ["--x" as string]: "0rem", ["--y" as string]: "-3rem" }} />
                <span style={{ left: "58%", top: "22%", ["--x" as string]: "2.2rem", ["--y" as string]: "-2rem" }} />
                <span style={{ left: "68%", top: "18%", ["--x" as string]: "3rem", ["--y" as string]: "-1rem" }} />
                <span style={{ left: "40%", top: "30%", ["--x" as string]: "-2.5rem", ["--y" as string]: "1rem" }} />
                <span style={{ left: "54%", top: "30%", ["--x" as string]: "2.4rem", ["--y" as string]: "1.4rem" }} />
                <span style={{ left: "62%", top: "28%", ["--x" as string]: "3rem", ["--y" as string]: "2.4rem" }} />
              </div>
            ) : null}
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="eyebrow">
                  <SealCheck size={16} weight="duotone" />
                  Payment verified
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-[var(--foreground)]">
                  Task completed and ready for buyer review
                </h3>
              </div>
              <a
                href={job.verification.horizonUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
              >
                Open transaction receipt
                <ArrowRight size={16} weight="bold" />
              </a>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="metric-card">
                <p className="section-label">Source account</p>
                <p className="mt-2 font-mono text-sm text-[var(--foreground)]">
                  {shortenWallet(job.verification.sourceAccount)}
                </p>
              </div>
              <div className="metric-card">
                <p className="section-label">Paid to</p>
                <p className="mt-2 font-mono text-sm text-[var(--foreground)]">
                  {shortenWallet(job.verification.destinationAccount)}
                </p>
              </div>
              <div className="metric-card">
                <p className="section-label">Submitted</p>
                <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                  {formatDate(job.verification.createdAt)}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="metric-card">
                <p className="section-label">Transferred</p>
                <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                  {job.verification.transferredAmount} {job.verification.transferredAsset}
                </p>
              </div>
              <div className="metric-card">
                <p className="section-label">Ledger</p>
                <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                  {job.verification.ledger}
                </p>
              </div>
              <div className="metric-card">
                <p className="section-label">Review deposit</p>
                <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                  ${job.reviewDepositUsd.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="surface-card-tint mt-5 rounded-[1.4rem] p-5">
              <p className="section-label">Task output</p>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{job.result}</p>
            </div>

            {reviewPending || reviewDone ? (
              <motion.div
                className="soroban-status mt-5"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="orbit-shell">
                  {reviewDone ? (
                    <div className="orbit-core">
                      <SealCheck
                        size={20}
                        weight="fill"
                        className="success-check text-[var(--success)]"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="orbit-core">
                        <Wallet size={18} weight="duotone" className="text-[var(--lilac-hover)]" />
                      </div>
                      <div className="orbit-wallet text-[var(--teal)]">
                        <Wallet size={14} weight="fill" />
                      </div>
                    </>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {reviewDone ? "Attestation finalized" : "Attesting on Soroban"}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {reviewDone
                      ? "The signed review is now sealed into the trust graph with a live reputation update."
                      : "Freighter signing and contract submission are in progress. Keep this tab open while the trust record is written."}
                  </p>
                </div>
              </motion.div>
            ) : null}

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Outcome
                </span>
                <select
                  className="input-shell"
                  value={reviewForm.success ? "success" : "failure"}
                  onChange={(event) =>
                    setReviewForm((current) => ({
                      ...current,
                      success: event.target.value === "success",
                    }))
                  }
                >
                  <option value="success">Success</option>
                  <option value="failure">Failure</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Rating
                </span>
                <input
                  className="input-shell"
                  type="number"
                  min="1"
                  max="5"
                  value={reviewForm.reviewRating}
                  onChange={(event) =>
                    setReviewForm((current) => ({
                      ...current,
                      reviewRating: Number(event.target.value),
                    }))
                  }
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Buyer review
                </span>
                <textarea
                  className="input-shell min-h-[110px]"
                  value={reviewForm.comment}
                  onChange={(event) =>
                    setReviewForm((current) => ({
                      ...current,
                      comment: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Review deposit transaction hash
                </span>
                <input
                  className="input-shell font-mono text-sm"
                  placeholder={`Send the review deposit to ${shortenWallet(job.reviewDepositWallet ?? "")}`}
                  value={reviewForm.reviewDepositTxHash ?? ""}
                  onChange={(event) =>
                    setReviewForm((current) => ({
                      ...current,
                      reviewDepositTxHash: event.target.value,
                    }))
                  }
                />
                <p className="text-sm text-[var(--muted)]">
                  Send the small deposit to{" "}
                  <span className="font-mono">
                    {job.reviewDepositWallet}
                  </span>{" "}
                  before signing the attestation.
                </p>
              </label>
            </div>

            {reviewError ? (
              <p className="alert-error mt-4">
                {reviewError}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <motion.button
                type="button"
                onClick={submitReview}
                disabled={reviewPending || reviewDone}
                className="btn-dark"
                whileHover={prefersReducedMotion ? undefined : { y: -2, scale: 1.01 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
              >
                <CheckCircle size={16} weight="duotone" />
                {reviewPending
                  ? "Signing and writing..."
                  : reviewDone
                    ? "Attestation issued"
                    : "Sign and issue attestation"}
              </motion.button>
              <p className="self-center text-sm text-[var(--muted)]">
                Reputation changes only after receipt verification, buyer wallet
                signature, and Soroban submission.
              </p>
            </div>
          </motion.div>
        ) : null}
      </motion.section>

      <NetworkOpsPanel
        initialNetworkSummary={initialNetworkSummary}
        verifierAgent={verifierAgent}
        initialDisputes={initialDisputes}
      />
    </div>
  );
}
