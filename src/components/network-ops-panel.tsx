"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import {
  ArrowUpRight,
  CheckCircle,
  Coins,
  MagnifyingGlass,
  Pulse,
  ShieldCheck,
  Wallet,
} from "@phosphor-icons/react";
import { DisputeDesk } from "@/components/dispute-desk";
import { ReputationRing } from "@/components/reputation-ring";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  shortenWallet,
} from "@/lib/format";
import {
  AgentSnapshot,
  Dispute,
  OnchainSyncSummary,
  TestnetAccountSummary,
  TestnetNetworkSummary,
} from "@/lib/types";

type NetworkOpsPanelProps = {
  initialNetworkSummary: TestnetNetworkSummary;
  verifierAgent: AgentSnapshot | null;
  initialDisputes: Dispute[];
};

export function NetworkOpsPanel({
  initialNetworkSummary,
  verifierAgent,
  initialDisputes,
}: NetworkOpsPanelProps) {
  const prefersReducedMotion = useReducedMotion();
  const [networkSummary, setNetworkSummary] =
    useState<TestnetNetworkSummary>(initialNetworkSummary);
  const [accountAddress, setAccountAddress] = useState("");
  const [accountResult, setAccountResult] = useState<TestnetAccountSummary | null>(
    null,
  );
  const [accountError, setAccountError] = useState<string | null>(null);
  const [fundingState, setFundingState] = useState<string | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [fundingAccount, setFundingAccount] = useState(false);
  const [onchainState, setOnchainState] = useState<OnchainSyncSummary | null>(null);
  const [onchainError, setOnchainError] = useState<string | null>(null);
  const [syncingOnchain, setSyncingOnchain] = useState(false);
  const [onchainWallet, setOnchainWallet] = useState<string | null>(null);

  async function refreshNetwork() {
    const response = await fetch("/api/testnet/network", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) {
      setNetworkSummary(data as TestnetNetworkSummary);
    }
  }

  async function lookupAccount() {
    setLoadingAccount(true);
    setAccountError(null);
    setFundingState(null);

    const response = await fetch(`/api/testnet/account/${accountAddress.trim()}`, {
      cache: "no-store",
    });
    const data = await response.json();

    setLoadingAccount(false);

    if (!response.ok) {
      setAccountResult(null);
      setAccountError(data.error ?? "Unable to load account.");
      return;
    }

    setAccountResult(data as TestnetAccountSummary);
  }

  async function fundAccount() {
    setFundingAccount(true);
    setAccountError(null);
    setFundingState(null);

    const response = await fetch("/api/testnet/fund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: accountAddress.trim() }),
    });
    const data = await response.json();

    setFundingAccount(false);

    if (!response.ok) {
      setFundingState(data.error ?? "Unable to fund account.");
      return;
    }

    setFundingState(`Account funded. Transaction hash: ${data.hash}`);
    await lookupAccount();
    await refreshNetwork();
  }

  async function syncOnchain() {
    if (!verifierAgent) return;

    setSyncingOnchain(true);
    setOnchainError(null);

    const response = await fetch(`/api/onchain/sync/${verifierAgent.wallet}`, {
      method: "POST",
    });
    const data = await response.json();

    setSyncingOnchain(false);

    if (!response.ok) {
      setOnchainState(null);
      setOnchainWallet(verifierAgent.wallet);
      setOnchainError(data.error ?? "Unable to sync onchain state.");
      return;
    }

    setOnchainState(data as OnchainSyncSummary);
    setOnchainWallet(verifierAgent.wallet);
  }

  const visibleOnchainState =
    verifierAgent && onchainWallet === verifierAgent.wallet ? onchainState : null;
  const visibleOnchainError =
    verifierAgent && onchainWallet === verifierAgent.wallet ? onchainError : null;

  return (
    <aside id="verifier" className="space-y-5">
      <motion.section
        className="surface-card-dark rounded-[1.8rem] p-6 text-white"
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.16 }}
        transition={{ duration: 0.45 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow eyebrow-dark">
              <Pulse size={16} weight="duotone" />
              Testnet network
            </div>
            <h3 className="mt-4 text-2xl font-semibold">Live network status and wallet tools</h3>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              Use this panel to verify the latest testnet state, inspect a wallet,
              and fund a new public key before sending a task receipt through the
              issuance flow.
            </p>
          </div>
          <motion.button
            type="button"
            onClick={refreshNetwork}
            className="btn-secondary-dark"
            whileHover={prefersReducedMotion ? undefined : { y: -2 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
          >
            Refresh
          </motion.button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="metric-card-dark">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
              Latest ledger
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatNumber(networkSummary.latestLedger)}
            </p>
          </div>
          <div className="metric-card-dark">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
              Protocol
            </p>
            <p className="mt-2 text-2xl font-semibold">
              v{networkSummary.protocolVersion}
            </p>
          </div>
          <div className="metric-card-dark">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
              Closed
            </p>
            <p className="mt-2 text-base font-semibold">
              {formatDate(networkSummary.closedAt)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={networkSummary.horizonUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary-dark"
          >
            <ArrowUpRight className="h-4 w-4" />
            Open Horizon
          </a>
          <a
            href={networkSummary.friendbotUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary-dark"
          >
            <ArrowUpRight className="h-4 w-4" />
            Open Friendbot
          </a>
        </div>
      </motion.section>

      <motion.section
        className="surface-card rounded-[1.8rem] p-6"
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.16 }}
        transition={{ duration: 0.45, delay: 0.04 }}
      >
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[rgba(167,139,250,0.1)] p-3 text-[var(--lilac-hover)]">
            <Wallet size={20} weight="duotone" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Wallet lookup
            </p>
            <p className="mt-1 text-sm leading-7 text-slate-600">
              Check whether a buyer wallet exists on testnet and provision it with
              Friendbot if it has not been funded yet.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <input
            className="input-shell font-mono text-sm"
            placeholder="Paste a Stellar public key"
            value={accountAddress}
            onChange={(event) => setAccountAddress(event.target.value)}
          />
          <div className="flex flex-wrap gap-3">
            <motion.button
              type="button"
              onClick={lookupAccount}
              disabled={loadingAccount || !accountAddress.trim()}
              className="btn-secondary"
              whileHover={prefersReducedMotion ? undefined : { y: -2 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
            >
              <MagnifyingGlass size={16} weight="bold" />
              {loadingAccount ? "Checking..." : "Check account"}
            </motion.button>
            <motion.button
              type="button"
              onClick={fundAccount}
              disabled={fundingAccount || !accountAddress.trim()}
              className="btn-primary"
              whileHover={prefersReducedMotion ? undefined : { y: -2 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
            >
              <Coins size={16} weight="duotone" />
              {fundingAccount ? "Funding..." : "Fund with Friendbot"}
            </motion.button>
          </div>
        </div>

        {accountError ? (
          <p className="alert-error mt-4">
            {accountError}
          </p>
        ) : null}

        {fundingState ? (
          <p className="mt-4 rounded-2xl border border-[rgba(52,211,153,0.18)] bg-[rgba(52,211,153,0.1)] px-4 py-3 text-sm text-[var(--success)]">
            {fundingState}
          </p>
        ) : null}

        {accountResult ? (
          <div className="surface-card-tint mt-5 rounded-[1.5rem] p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
              <CheckCircle size={16} weight="duotone" className="text-[var(--teal-strong)]" />
              {accountResult.exists ? "Account found on testnet" : "Account not funded yet"}
            </div>
            <p className="mt-3 font-mono text-xs text-[var(--muted)]">
              {shortenWallet(accountResult.address)}
            </p>

            {accountResult.exists ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="metric-card">
                  <p className="section-label">Native balance</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                    {accountResult.nativeBalance} XLM
                  </p>
                </div>
                <div className="metric-card">
                  <p className="section-label">Subentries</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                    {accountResult.subentryCount}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </motion.section>

      {verifierAgent ? (
        <motion.section
          className="surface-card rounded-[1.8rem] p-6"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.16 }}
          transition={{ duration: 0.45, delay: 0.08 }}
        >
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-[rgba(167,139,250,0.16)] bg-[rgba(11,11,17,0.92)] p-3 text-[var(--foreground)]">
              <ShieldCheck size={20} weight="duotone" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Selected agent trust summary
              </p>
              <p className="mt-1 text-sm leading-7 text-slate-600">
                Review the current wallet identity, commercial record, and trust
                score before attaching a new attestation.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[1.6rem] border border-[rgba(167,139,250,0.14)] bg-[rgba(11,11,17,0.94)] p-5 text-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                  Selected agent
                </p>
                <h3 className="mt-2 text-xl font-semibold">{verifierAgent.name}</h3>
                <p className="mt-1 font-mono text-xs text-slate-400">
                  {shortenWallet(verifierAgent.wallet)}
                </p>
              </div>
              <ReputationRing value={verifierAgent.overallScore} size={96} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="metric-card-dark">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                  Paid completions
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {formatNumber(verifierAgent.paidCompletions)}
                </p>
              </div>
              <div className="metric-card-dark">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                  Earned
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {formatCurrency(verifierAgent.earningsUsd)}
                </p>
              </div>
              <div className="metric-card-dark">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                  Buyer rating
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {verifierAgent.averageRating.toFixed(1)}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                    Soroban sync
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    Compare indexed reputation with contract-backed attestation state.
                  </p>
                </div>
                <motion.button
                  type="button"
                  onClick={syncOnchain}
                  disabled={syncingOnchain}
                  className="btn-secondary-dark"
                  whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                >
                  {syncingOnchain ? "Syncing..." : "Sync onchain"}
                </motion.button>
              </div>

              {visibleOnchainError ? (
                <p className="alert-error mt-4">
                  {visibleOnchainError}
                </p>
              ) : null}

              {visibleOnchainState ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="metric-card-dark">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                      Onchain count
                    </p>
                    <p className="mt-2 text-xl font-semibold">
                      {formatNumber(visibleOnchainState.onchainAttestationCount)}
                    </p>
                  </div>
                  <div className="metric-card-dark">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                      Indexed count
                    </p>
                    <p className="mt-2 text-xl font-semibold">
                      {formatNumber(visibleOnchainState.indexedAttestationCount)}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </motion.section>
      ) : null}

      <DisputeDesk
        key={verifierAgent?.id ?? "network"}
        verifierAgent={verifierAgent}
        initialDisputes={initialDisputes}
      />
    </aside>
  );
}
