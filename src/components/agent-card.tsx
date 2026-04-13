"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Wallet } from "@phosphor-icons/react";
import { CategoryScoreBars } from "@/components/category-score-bars";
import { ReputationRing } from "@/components/reputation-ring";
import { formatCurrency, shortenWallet } from "@/lib/format";
import { AgentSnapshot } from "@/lib/types";

export function AgentCard({ agent }: { agent: AgentSnapshot }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.article
      className="agent-card-shell surface-card p-6"
      style={{ borderRadius: "16px" }}
      whileHover={prefersReducedMotion ? undefined : { y: -4, borderColor: "var(--line-accent)" }}
      transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.2 }}
    >
      {/* Header — avatar + name + score ring */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.div
            className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[rgba(167,139,250,0.1)] border border-[var(--line-accent)] text-sm font-bold text-accent"
            whileHover={prefersReducedMotion ? undefined : { rotate: -4, scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {agent.name
              .split(" ")
              .map((part) => part[0])
              .join("")}
          </motion.div>
          <div>
            <h3 className="text-base font-bold text-[var(--foreground)]">{agent.name}</h3>
            <p className="text-xs text-[var(--muted)] mt-0.5">{agent.handle}</p>
          </div>
        </div>

        <ReputationRing value={agent.overallScore} size={84} />
      </div>

      {/* Headline */}
      <p className="text-sm text-body leading-6">{agent.headline}</p>

      {/* Specialty pills */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {agent.specialties.map((specialty) => (
          <motion.span
            key={specialty}
            className="pill"
            whileHover={prefersReducedMotion ? undefined : { y: -2 }}
          >
            {specialty}
          </motion.span>
        ))}
      </div>

      {/* Metrics */}
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        <div className="metric-card">
          <p className="text-label" style={{ fontSize: "0.65rem" }}>Earned</p>
          <p className="mt-1.5 text-base font-bold text-[var(--foreground)]">
            {formatCurrency(agent.earningsUsd)}
          </p>
        </div>
        <div className="metric-card">
          <p className="text-label" style={{ fontSize: "0.65rem" }}>Paid Jobs</p>
          <p className="mt-1.5 text-base font-bold text-[var(--foreground)]">
            {agent.paidCompletions}
          </p>
        </div>
        <div className="metric-card">
          <p className="text-label" style={{ fontSize: "0.65rem" }}>Rating</p>
          <p className="mt-1.5 text-base font-bold text-[var(--foreground)]">
            {agent.averageRating.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Category score bars */}
      <div className="mt-5">
        <CategoryScoreBars scores={agent.scores} />
      </div>

      {/* Wallet + profile CTA */}
      <motion.div
        className="mt-5 flex flex-col gap-3 rounded-[12px] border border-[var(--line)] bg-[var(--background-elevated)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
        whileHover={prefersReducedMotion ? undefined : { borderColor: "var(--line-accent)" }}
        transition={{ duration: 0.15 }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[rgba(167,139,250,0.1)] border border-[var(--line-accent)]">
            <Wallet size={15} weight="duotone" style={{ color: "var(--lilac)" }} />
          </div>
          <div>
            <p className="text-label" style={{ fontSize: "0.62rem" }}>Wallet</p>
            <p className="font-mono text-xs text-accent mt-0.5">{shortenWallet(agent.wallet)}</p>
          </div>
        </div>
        <Link
          href={`/agent/${agent.id}`}
          className="btn-primary"
          style={{ padding: "0.45rem 1rem", fontSize: "0.8rem" }}
        >
          View profile
          <ArrowUpRight size={14} weight="bold" />
        </Link>
      </motion.div>
    </motion.article>
  );
}
