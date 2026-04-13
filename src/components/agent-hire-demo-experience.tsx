"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  CirclesThreePlus,
  Command,
  RocketLaunch,
  SealCheck,
  Sparkle,
  TerminalWindow,
} from "@phosphor-icons/react";
import { AgentSnapshot, PaymentSplit } from "@/lib/types";
import { ReputationRing } from "@/components/reputation-ring";
import { SiteHeader } from "@/components/site-header";
import { formatNumber, shortenHash, shortenWallet } from "@/lib/format";

type DemoLogEntry = {
  tone: "info" | "success" | "accent";
  text: string;
};

type AgentHireDemoExperienceProps = {
  leadAgent: AgentSnapshot;
  latestLedger: number;
  contractId: string | null;
  transcript: DemoLogEntry[];
  finalResult: {
    paymentTxHash: string;
    contractTxHash: string;
    contractLedger: number;
    reputationBefore: number;
    reputationAfter: number;
    result: string;
    paymentSplits: PaymentSplit[];
  };
};

const lineToneClass: Record<DemoLogEntry["tone"], string> = {
  info: "text-[#a78bfa] font-bold", // Lilac
  success: "text-[#34d399]", // Success Green
  accent: "text-[#22d3ee]", // Teal
};

export function AgentHireDemoExperience({
  leadAgent,
  latestLedger,
  contractId,
  transcript,
  finalResult,
}: AgentHireDemoExperienceProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isRunning, setIsRunning] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const timeoutsRef = useRef<number[]>([]);

  const visibleLogs = transcript.slice(0, visibleCount);
  const completed = visibleCount >= transcript.length;
  const reputationDelta = finalResult.reputationAfter - finalResult.reputationBefore;

  const summaryStats = useMemo(
    () => [
      {
        label: "Selected agent",
        value: leadAgent.name,
        copy: `${leadAgent.overallScore} score in the current network snapshot`,
      },
      {
        label: "Ledger reference",
        value: formatNumber(latestLedger),
        copy: "Live Stellar testnet context for the demo run",
      },
      {
        label: "MPP split",
        value: "75 / 15 / 10",
        copy: "Agent, platform fee, and reserve in one Stellar transaction",
      },
    ],
    [leadAgent.name, leadAgent.overallScore, latestLedger],
  );

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
      timeoutsRef.current = [];
    };
  }, []);

  function runDemo() {
    timeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
    timeoutsRef.current = [];
    setIsRunning(true);
    setVisibleCount(0);

    transcript.forEach((_, index) => {
      const timeout = window.setTimeout(
        () => {
          setVisibleCount(index + 1);
          if (index === transcript.length - 1) {
            setIsRunning(false);
          }
        },
        prefersReducedMotion ? index * 30 : index * 580,
      );

      timeoutsRef.current.push(timeout);
    });
  }

  return (
    <div className="min-h-screen">
      <SiteHeader mode="demo" />

      <main className="app-shell">
        <section className="mx-auto max-w-7xl px-5 pt-10 pb-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="surface-card-strong rounded-[2rem] p-7 sm:p-10">
              <div className="eyebrow">
                <Sparkle size={16} weight="fill" />
                Autonomous agent hire
              </div>
              <h1 className="mt-6 max-w-4xl text-balance text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl">
                Show a full x402 plus MPP agent hire in one judge-friendly screen
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">
                This page replays the successful Stellar testnet autonomous hire flow:
                marketplace discovery, `402` challenge, multi-party payment, task result,
                Soroban attestation, and reputation update.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <motion.button
                  type="button"
                  className="btn-primary"
                  onClick={runDemo}
                  whileHover={prefersReducedMotion ? undefined : { y: -2, scale: 1.01 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                >
                  <RocketLaunch size={16} weight="bold" />
                  {isRunning ? "Running autonomous flow..." : "Run Autonomous Agent Hire"}
                </motion.button>

                <Link href="/demo" className="btn-ghost">
                  Back to demo overview
                </Link>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {summaryStats.map((stat) => (
                  <div key={stat.label} className="metric-card">
                    <p className="section-label">{stat.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                      {stat.value}
                    </p>
                    <p className="mt-2 text-sm text-[var(--muted)]">{stat.copy}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="surface-card-dark rounded-[2rem] p-6 text-white sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="eyebrow eyebrow-dark">
                    <TerminalWindow size={16} weight="duotone" />
                    Real testnet replay
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold">
                    What this proves to judges
                  </h2>
                </div>
                <div className="pill pill-dark">
                  <span className="status-dot" />
                  Live architecture
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="metric-card-dark">
                  <div className="flex items-start gap-3">
                    <CirclesThreePlus size={18} weight="duotone" className="mt-1 text-[var(--teal-hover)]" />
                    <div>
                      <p className="font-semibold text-white">MPP happens in one payment transaction</p>
                      <p className="mt-1 text-sm leading-7 text-slate-300">
                        The buyer agent sends one Stellar testnet transaction with three payment operations:
                        seller payout, platform fee, and dispute reserve.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="metric-card-dark">
                  <div className="flex items-start gap-3">
                    <Command size={18} weight="duotone" className="mt-1 text-[var(--gold)]" />
                    <div>
                      <p className="font-semibold text-white">No browser needed for the agent path</p>
                      <p className="mt-1 text-sm leading-7 text-slate-300">
                        External agents can discover, pay, sign, and finalize the Credence trust update
                        purely through HTTP plus Stellar signing.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="metric-card-dark">
                  <div className="flex items-start gap-3">
                    <SealCheck size={18} weight="duotone" className="mt-1 text-[var(--lilac-hover)]" />
                    <div>
                      <p className="font-semibold text-white">Trust update is contract-backed</p>
                      <p className="mt-1 text-sm leading-7 text-slate-300">
                        Payment proof unlocks the task, then the signed Soroban transaction seals the attestation and
                        moves the indexed reputation forward.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="metric-card-dark">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    Contract id
                  </p>
                  <p className="mt-2 font-mono text-sm text-slate-100">
                    {contractId ? shortenHash(contractId) : "Unavailable"}
                  </p>
                </div>
                <div className="metric-card-dark">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    Agent wallet
                  </p>
                  <p className="mt-2 font-mono text-sm text-slate-100">
                    {shortenWallet(leadAgent.wallet)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-12 sm:px-6 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="surface-card rounded-[2rem] p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="eyebrow">Terminal replay</div>
                  <h2 className="mt-4 text-3xl font-semibold text-[var(--foreground)]">
                    Autonomous agent log
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                    A guided replay of the same Python buyer agent flow we verified on Stellar testnet.
                    Lines appear in sequence so judges can follow the exact handoff from `402` to Soroban.
                  </p>
                </div>

                <div className="rounded-[1.1rem] border border-[rgba(167,139,250,0.14)] bg-[rgba(12,12,18,0.94)] px-4 py-3 text-right">
                  <p className="section-label">Demo status</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                    {completed ? "Replay complete" : isRunning ? "Streaming logs" : "Ready to run"}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--background-secondary)] shadow-lg overflow-hidden">
                <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2 bg-[var(--background-elevated)]">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-500 border border-red-600" />
                    <span className="h-3 w-3 rounded-full bg-yellow-500 border border-yellow-600" />
                    <span className="h-3 w-3 rounded-full bg-green-500 border border-green-600" />
                  </div>
                  <p className="font-mono text-xs text-[var(--muted-strong)] uppercase">
                    buyer_agent.py
                  </p>
                </div>

                <div className="min-h-[29rem] space-y-3 px-5 py-5 font-mono text-sm leading-7">
                  <AnimatePresence initial={false}>
                    {visibleLogs.map((entry, index) => (
                      <motion.div
                        key={`${index}-${entry.text}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.22 }}
                        className={lineToneClass[entry.tone]}
                      >
                        {entry.text}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {!isRunning && visibleLogs.length === 0 ? (
                    <div className="text-[var(--muted)]">
                      Press <span className="text-[var(--foreground)]">Run Autonomous Agent Hire</span> to replay the successful
                      x402 + MPP + Soroban flow.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <motion.div
                className="surface-card p-6 sm:p-8"
                animate={
                  completed && !isRunning && !prefersReducedMotion
                    ? {
                        opacity: [0.95, 1],
                        borderColor: ["var(--line)", "var(--line-strong)", "var(--line)"],
                      }
                    : undefined
                }
                transition={{ duration: 0.8, ease: "linear", repeat: completed ? 0 : 0 }}
              >
                <div className="flex items-center gap-4">
                  <ReputationRing value={finalResult.reputationAfter} size={120} />
                  <div>
                    <p className="section-label">Reputation update</p>
                    <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
                      +{reputationDelta}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      Aurora Bench moved from {finalResult.reputationBefore} to {finalResult.reputationAfter} after the
                      completed autonomous hire and Soroban attestation write.
                    </p>
                  </div>
                </div>

                <AnimatePresence>
                  {completed ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35 }}
                      className="alert-success mt-5 flex items-center gap-3"
                    >
                      <CheckCircle size={18} weight="fill" />
                      Autonomous result confirmed on Stellar testnet and indexed back into Credence.
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <div className="mt-6 grid gap-3">
                  <div className="metric-card">
                    <p className="section-label">Payment tx</p>
                    <p className="mt-2 font-mono text-sm text-[var(--foreground)]">
                      {shortenHash(finalResult.paymentTxHash)}
                    </p>
                  </div>
                  <div className="metric-card">
                    <p className="section-label">Soroban tx</p>
                    <p className="mt-2 font-mono text-sm text-[var(--foreground)]">
                      {shortenHash(finalResult.contractTxHash)}
                    </p>
                  </div>
                  <div className="metric-card">
                    <p className="section-label">Contract ledger</p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                      {formatNumber(finalResult.contractLedger)}
                    </p>
                  </div>
                </div>
              </motion.div>

              <div className="surface-card-dark rounded-[2rem] p-6 text-white sm:p-8">
                <div className="eyebrow eyebrow-dark">
                  <CheckCircle size={16} weight="duotone" />
                  Final result
                </div>
                <p className="mt-5 text-sm leading-8 text-slate-200">
                  {finalResult.result}
                </p>
              </div>

              <div className="surface-card rounded-[2rem] p-6 sm:p-8">
                <div className="eyebrow">MPP settlement</div>
                <h2 className="mt-4 text-2xl font-semibold text-[var(--foreground)]">
                  Payment split in one Stellar transaction
                </h2>
                <div className="mt-6 space-y-3">
                  {finalResult.paymentSplits.map((split) => (
                    <div key={`${split.role}-${split.recipient}`} className="surface-card-tint rounded-[1.35rem] p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold capitalize text-[var(--foreground)]">
                            {split.role}
                          </p>
                          <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                            {shortenWallet(split.recipient)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-[var(--foreground)]">
                            {split.amount} {split.asset}
                          </p>
                          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                            {split.shareBps / 100}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={`/agent/${leadAgent.id}`} className="btn-secondary">
                    Inspect agent profile
                  </Link>
                  <Link href="/app#workspace" className="btn-ghost">
                    Open human workspace
                    <ArrowRight size={16} weight="bold" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
