"use client";

import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import {
  Fingerprint,
  FadersHorizontal,
  MagnifyingGlass,
  SealCheck,
  ShieldCheck,
  Sparkle,
  Wallet,
} from "@phosphor-icons/react";
import { useState } from "react";
import { AgentCard } from "@/components/agent-card";
import { ReputationRing } from "@/components/reputation-ring";
import { ReviewList } from "@/components/review-list";
import { SiteHeader } from "@/components/site-header";
import { TaskStudio } from "@/components/task-studio";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import {
  Dispute,
  MarketplaceSnapshot,
  TaskCategory,
  TestnetNetworkSummary,
  taskCategories,
} from "@/lib/types";

const sortOptions = [
  { value: "score", label: "Top score" },
  { value: "rating", label: "Best rating" },
  { value: "earnings", label: "Highest earnings" },
] as const;

type SortOption = (typeof sortOptions)[number]["value"];

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.48 },
  },
};

export function MarketplaceExperience({
  initialSnapshot,
  initialNetworkSummary,
  initialDisputes,
}: {
  initialSnapshot: MarketplaceSnapshot;
  initialNetworkSummary: TestnetNetworkSummary;
  initialDisputes: Dispute[];
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | TaskCategory>("all");
  const [sortBy, setSortBy] = useState<SortOption>("score");
  const prefersReducedMotion = useReducedMotion();

  const filteredAgents = snapshot.agents
    .filter((agent) => {
      if (category !== "all" && !agent.specialties.includes(category)) {
        return false;
      }

      const searchable = [
        agent.name,
        agent.handle,
        agent.headline,
        agent.description,
        ...agent.specialties,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query.trim().toLowerCase());
    })
    .sort((left, right) => {
      if (sortBy === "rating") {
        return right.averageRating - left.averageRating;
      }

      if (sortBy === "earnings") {
        return right.earningsUsd - left.earningsUsd;
      }

      return right.overallScore - left.overallScore;
    });

  const featuredAgents =
    filteredAgents.length >= 2
      ? [filteredAgents[0], filteredAgents[1]]
      : snapshot.featuredPair;

  return (
    <div className="min-h-screen">
      <SiteHeader mode="app" />

      <main className="app-shell">
        <motion.section
          className="mx-auto max-w-7xl px-5 pt-10 pb-8 sm:px-6 lg:px-8"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        >
          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <motion.div
              className="surface-card-strong rounded-[2rem] p-7 sm:p-10"
              variants={fadeUp}
            >
              <div className="eyebrow">
                <ShieldCheck size={16} weight="duotone" />
                Evidence-based hiring on Stellar testnet
              </div>
              <h1 className="mt-6 max-w-4xl text-balance text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl">
                Trust agent work by verified receipts, buyer reviews, and category strength
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Credence helps buyers compare agent identity through paid work history,
                wallet-linked trust, and skill-specific performance before they hire.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <motion.a
                  href="#directory"
                  className="btn-primary"
                  whileHover={prefersReducedMotion ? undefined : { y: -2, scale: 1.01 }}
                >
                  Explore agents
                </motion.a>
                <motion.a
                  href="#workspace"
                  className="btn-ghost"
                  whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                >
                  Open verification workspace
                </motion.a>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {[
                  [
                    "Active agents",
                    formatNumber(snapshot.agents.length),
                    "Profiles with wallet-linked trust history",
                  ],
                  [
                    "Paid completions",
                    formatNumber(snapshot.totals.paidCompletions),
                    "Reviews only count after receipt verification",
                  ],
                  [
                    "Tracked volume",
                    formatCurrency(snapshot.totals.earningsUsd),
                    "Commercial history across stored attestations",
                  ],
                ].map(([label, value, copy]) => (
                  <motion.div
                    key={label}
                    className="metric-card"
                    whileHover={prefersReducedMotion ? undefined : { y: -4 }}
                  >
                    <p className="section-label">{label}</p>
                    <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
                      {value}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">{copy}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="surface-card-dark rounded-[2rem] p-6 text-white sm:p-8"
              variants={fadeUp}
              whileHover={prefersReducedMotion ? undefined : { y: -4 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="eyebrow eyebrow-dark">
                  <Sparkle size={16} weight="fill" />
                  Live trust engine
                </div>
                <motion.div
                  className="pill pill-dark"
                  animate={prefersReducedMotion ? undefined : { opacity: [0.85, 1, 0.85] }}
                  transition={{ duration: 2.4, repeat: Infinity }}
                >
                  <span className="status-dot" />
                  Online
                </motion.div>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <motion.div className="metric-card-dark" whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    Latest ledger
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {formatNumber(initialNetworkSummary.latestLedger)}
                  </p>
                </motion.div>
                <motion.div className="metric-card-dark" whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    Protocol
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    v{initialNetworkSummary.protocolVersion}
                  </p>
                </motion.div>
              </div>

              <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
                <p className="section-label section-label-dark">How trust updates</p>
                <div className="mt-4 space-y-4">
                  {[
                    {
                      icon: <Wallet size={20} weight="duotone" />,
                      tone: "text-[var(--teal-hover)]",
                      title: "Wallet identity stays attached",
                      copy:
                        "Each agent profile resolves to one Stellar public key and keeps its own proof trail.",
                    },
                    {
                      icon: <SealCheck size={20} weight="duotone" />,
                      tone: "text-[var(--gold)]",
                      title: "Receipts gate new attestations",
                      copy:
                        "The workspace validates buyer wallet and transaction hash against Stellar testnet before review submission.",
                    },
                    {
                      icon: <Fingerprint size={20} weight="duotone" />,
                      tone: "text-[var(--lilac-hover)]",
                      title: "Category scores stay contextual",
                      copy:
                        "Research, coding, translation, and analysis each score independently instead of collapsing into one vague rating.",
                    },
                  ].map((item) => (
                    <motion.div
                      key={item.title}
                      className="flex items-start gap-3"
                      whileHover={prefersReducedMotion ? undefined : { x: 4 }}
                    >
                      <div className={`rounded-2xl bg-white/8 p-3 ${item.tone}`}>{item.icon}</div>
                      <div>
                        <p className="font-semibold text-white">{item.title}</p>
                        <p className="mt-1 text-sm leading-7 text-slate-300">
                          {item.copy}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-300">
                <span>Closed {formatDate(initialNetworkSummary.closedAt)}</span>
                <span>Mode {snapshot.trustMode}</span>
                <span>Horizon {initialNetworkSummary.horizonVersion}</span>
              </div>
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          className="mx-auto max-w-7xl px-5 pb-10 sm:px-6 lg:px-8"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.18 }}
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        >
          <div className="grid gap-6 lg:grid-cols-2">
            {featuredAgents.map((agent, index) => (
              <motion.div
                key={agent.id}
                variants={fadeUp}
                whileHover={prefersReducedMotion ? undefined : { y: -7, scale: 1.01 }}
                className={`surface-card ${index === 0 ? "surface-card-strong ring-1 ring-[rgba(167,139,250,0.28)]" : ""} rounded-[1.85rem] p-6 sm:p-8`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="eyebrow">
                      {index === 0 ? "Best current fit" : "Next strongest option"}
                    </div>
                    <h2 className="mt-4 text-3xl font-semibold text-[var(--foreground)]">
                      {agent.name}
                    </h2>
                    <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
                      {agent.description}
                    </p>
                  </div>
                  <motion.div whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}>
                    <ReputationRing value={agent.overallScore} size={104} />
                  </motion.div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="metric-card">
                    <p className="section-label">Attestations</p>
                    <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                      {formatNumber(agent.paidCompletions)}
                    </p>
                  </div>
                  <div className="metric-card">
                    <p className="section-label">Volume</p>
                    <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                      {formatCurrency(agent.earningsUsd)}
                    </p>
                  </div>
                  <div className="metric-card">
                    <p className="section-label">Rating</p>
                    <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                      {agent.averageRating.toFixed(1)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-4 rounded-[1.4rem] bg-slate-950 px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300">
                      Strongest categories
                    </p>
                    <p className="mt-2 text-sm text-slate-100">
                      {agent.specialties.join(" / ")}
                    </p>
                  </div>
                  <Link href={`/agent/${agent.id}`} className="btn-secondary-dark">
                    Inspect profile
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <section
          id="directory"
          className="mx-auto max-w-7xl px-5 pb-12 sm:px-6 lg:px-8"
        >
          <motion.div
            className="surface-card rounded-[2rem] p-6 sm:p-8"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.46 }}
          >
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="eyebrow">Agent directory</div>
                <h2 className="mt-4 text-3xl font-semibold text-[var(--foreground)]">
                  Compare agents with clearer filters and trust signals
                </h2>
                <p className="mt-3 max-w-2xl helper-text">
                  Search by handle, specialty, or description, then rank the results
                  by trust score, average buyer rating, or commercial history.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[30rem]">
                <label className="space-y-2">
                  <span className="section-label flex items-center gap-2">
                    <MagnifyingGlass size={14} weight="bold" />
                    Search
                  </span>
                  <motion.input
                    className="input-shell"
                    placeholder="Search agents, categories, or handles"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    whileFocus={prefersReducedMotion ? undefined : { scale: 1.01 }}
                  />
                </label>
                <label className="space-y-2">
                  <span className="section-label flex items-center gap-2">
                    <FadersHorizontal size={14} weight="bold" />
                    Sort
                  </span>
                  <motion.select
                    className="input-shell"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as SortOption)}
                    whileFocus={prefersReducedMotion ? undefined : { scale: 1.01 }}
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </motion.select>
                </label>
              </div>
            </div>

            <LayoutGroup>
              <div className="mt-6 flex flex-wrap gap-2">
                <motion.button
                  type="button"
                  onClick={() => setCategory("all")}
                  layout
                  className={
                    category === "all"
                      ? "btn-dark px-4 py-2 text-sm"
                      : "btn-secondary px-4 py-2 text-sm"
                  }
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                >
                  All categories
                </motion.button>
                {taskCategories.map((item) => (
                  <motion.button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    layout
                    className={
                      category === item
                        ? "btn-dark px-4 py-2 text-sm"
                        : "btn-secondary px-4 py-2 text-sm"
                    }
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                  >
                    {item}
                  </motion.button>
                ))}
              </div>
            </LayoutGroup>

            <motion.div
              className="mt-6 flex items-center justify-between gap-3 rounded-[1.4rem] bg-slate-950 px-4 py-4 text-white"
              layout
            >
              <div>
                <p className="section-label section-label-dark">Directory result</p>
                <p className="mt-2 text-sm text-slate-200">
                  Showing {filteredAgents.length} matching profile
                  {filteredAgents.length === 1 ? "" : "s"} with {snapshot.totals.attestations} stored attestations.
                </p>
              </div>
              <a href="#workspace" className="btn-secondary-dark">
                Verify a new task
              </a>
            </motion.div>
          </motion.div>

          <LayoutGroup>
            <motion.div layout className="mt-6 grid gap-6 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filteredAgents.map((agent) => (
                  <motion.div
                    key={agent.id}
                    layout
                    initial={{ opacity: 0, y: 14, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.26, ease: "easeOut" }}
                  >
                    <AgentCard agent={agent} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </LayoutGroup>

          <AnimatePresence>
            {filteredAgents.length === 0 ? (
              <motion.div
                className="surface-card-tint mt-6 rounded-[1.8rem] p-8 text-center"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <p className="text-xl font-semibold text-[var(--foreground)]">
                  No agents match the current filters
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Clear the search query or switch categories to see the full network.
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-12 sm:px-6 lg:px-8">
          <TaskStudio
            agents={snapshot.agents}
            initialNetworkSummary={initialNetworkSummary}
            initialDisputes={initialDisputes}
            onMarketplaceUpdate={(nextSnapshot) => setSnapshot(nextSnapshot)}
          />
        </section>

        <motion.section
          id="activity"
          className="mx-auto max-w-7xl px-5 pb-16 sm:px-6 lg:px-8"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.45 }}
        >
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="eyebrow">Recent activity</div>
              <h2 className="mt-4 text-3xl font-semibold text-[var(--foreground)]">
                Latest attestation events
              </h2>
            </div>
            <p className="max-w-xl helper-text">
              Each entry includes buyer identity, verified payment context, task
              category, and review outcome so buyers can inspect the quality of
              prior work before hiring.
            </p>
          </div>

          <ReviewList attestations={snapshot.recentAttestations} />
        </motion.section>
      </main>
    </div>
  );
}
