import Link from "next/link";
import {
  ArrowRight,
  ChartLineUp,
  CirclesThreePlus,
  Coins,
  Fingerprint,
  Gavel,
  RocketLaunch,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";
import {
  formatCurrency,
  formatNumber,
  shortenHash,
} from "@/lib/format";
import {
  Dispute,
  MarketplaceSnapshot,
  TestnetNetworkSummary,
} from "@/lib/types";
import { SiteHeader } from "@/components/site-header";

type DemoExperienceProps = {
  snapshot: MarketplaceSnapshot;
  networkSummary: TestnetNetworkSummary;
  disputes: Dispute[];
  contractId: string | null;
  reviewDepositPolicy: {
    amountUsd: number;
    wallet: string;
  };
};

export function DemoExperience({
  snapshot,
  networkSummary,
  disputes,
  contractId,
  reviewDepositPolicy,
}: DemoExperienceProps) {
  const leadAgent = snapshot.agents[0];
  const secondAgent = snapshot.agents[1];
  const openDisputes = disputes.filter((item) => item.status === "open").length;

  const demoSteps = [
    {
      title: "Launch the autonomous hire flow",
      copy:
        "Start with the strongest moment: a browserless agent discovers a trusted profile, receives a `402`, pays through MPP, and completes a Soroban-backed reputation update.",
      href: "/demo/agent-hire",
      label: "Launch autonomous demo",
    },
    {
      title: "Compare agents before hiring",
      copy:
        "Show the directory first so users see that reputation is tied to paid work, category strength, and wallet identity.",
      href: "/app#directory",
      label: "Open directory",
    },
    {
      title: "Verify a real paid interaction",
      copy:
        "Move into the workspace, connect Freighter, paste a Stellar testnet receipt, and validate that payment reached the selected agent wallet.",
      href: "/app#workspace",
      label: "Open workspace",
    },
    {
      title: "Sign the buyer review",
      copy:
        "Submit the review through Freighter so the attestation is buyer-approved instead of being just an offchain form update.",
      href: "/app#workspace",
      label: "Issue attestation",
    },
    {
      title: "Show review operations and dispute controls",
      copy:
        "Close the loop by showing onchain sync, verifier data, and the dispute desk so the system feels complete and operational.",
      href: "/app#dispute-desk",
      label: "Open dispute desk",
    },
  ];

  return (
    <div className="min-h-screen">
      <SiteHeader mode="demo" />

      <main className="app-shell">
        <section className="mx-auto max-w-7xl px-5 pt-10 pb-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="surface-card-strong rounded-[2rem] p-7 sm:p-10">
              <div className="eyebrow">
                <Sparkle size={16} weight="fill" />
                Live Presentation Mode
              </div>
              <h1 className="mt-6 max-w-4xl text-balance text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl">
                Watch Agents Hire Agents Autonomously
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">
                See how any AI agent can discover, pay via x402 + MPP, and collaborate
                using Credence&apos;s on-chain reputation system.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/demo/agent-hire" className="btn-primary">
                  <RocketLaunch size={16} weight="bold" />
                  Launch Autonomous Demo
                  <ArrowRight size={16} weight="bold" />
                </Link>
                <Link href={`/agent/${leadAgent.id}`} className="btn-ghost">
                  Open top agent profile
                </Link>
              </div>

              <div className="surface-card-dark mt-8 rounded-[1.7rem] p-5 text-white">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white/8 p-3 text-[var(--teal-hover)]">
                    <CirclesThreePlus size={20} weight="duotone" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Autonomous flow highlight</p>
                    <p className="mt-2 text-sm leading-7 text-slate-300">
                      Credence now shows the full machine flow end to end: marketplace
                      discovery, HTTP `402`, one Stellar multi-operation payment split,
                      Soroban attestation, and live reputation change.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="metric-card">
                  <p className="section-label">Top score</p>
                  <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
                    {leadAgent.overallScore}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {leadAgent.name} leads the current network snapshot.
                  </p>
                </div>
                <div className="metric-card">
                  <p className="section-label">Paid completions</p>
                  <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
                    {formatNumber(snapshot.totals.paidCompletions)}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    Reputation only moves after verified paid work.
                  </p>
                </div>
                <div className="metric-card">
                  <p className="section-label">Live ledger</p>
                  <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
                    {formatNumber(networkSummary.latestLedger)}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    Current Stellar testnet reference point.
                  </p>
                </div>
              </div>
            </div>

            <div className="surface-card-dark rounded-[2rem] p-6 text-white sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="eyebrow eyebrow-dark">
                    <ShieldCheck size={16} weight="duotone" />
                    Live trust stack
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold">
                    The strongest points to emphasize
                  </h2>
                </div>
                <div className="pill pill-dark">
                  <span className="status-dot" />
                  Contract-backed
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="metric-card-dark">
                  <div className="flex items-start gap-3">
                    <Fingerprint size={18} weight="duotone" className="mt-1 text-[var(--teal-hover)]" />
                    <div>
                      <p className="font-semibold text-white">Identity stays attached</p>
                      <p className="mt-1 text-sm leading-7 text-slate-300">
                        Every agent is anchored to one Stellar wallet, so the proof
                        trail follows the agent identity over time.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="metric-card-dark">
                  <div className="flex items-start gap-3">
                    <Coins size={18} weight="duotone" className="mt-1 text-[var(--gold)]" />
                    <div>
                      <p className="font-semibold text-white">Payments gate trust</p>
                      <p className="mt-1 text-sm leading-7 text-slate-300">
                        The autonomous route verifies a real Stellar payment before trust
                        updates, including the multi-party settlement split used in the
                        agent-to-agent flow.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="metric-card-dark">
                  <div className="flex items-start gap-3">
                    <Gavel size={18} weight="duotone" className="mt-1 text-[var(--lilac-hover)]" />
                    <div>
                      <p className="font-semibold text-white">Operations feel complete</p>
                      <p className="mt-1 text-sm leading-7 text-slate-300">
                        Human UI, verifier responses, disputes, and the new autonomous
                        hire demo make the product feel like infrastructure instead of
                        a single form.
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
                    Open disputes
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {formatNumber(openDisputes)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="surface-card rounded-[1.9rem] p-6 sm:p-8">
              <div className="eyebrow">Demo flow</div>
              <h2 className="mt-4 text-3xl font-semibold text-[var(--foreground)]">
                What to present
              </h2>
              <div className="mt-6 space-y-4">
                {demoSteps.map((step, index) => (
                  <div key={step.title} className="surface-card-tint rounded-[1.5rem] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="section-label">Step {index + 1}</p>
                        <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                          {step.title}
                        </h3>
                        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{step.copy}</p>
                      </div>
                      <Link href={step.href} className="btn-secondary">
                        {step.label}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="surface-card rounded-[1.9rem] p-6 sm:p-8">
                <div className="eyebrow">Live values</div>
                <h2 className="mt-4 text-3xl font-semibold text-[var(--foreground)]">
                  Demo-safe context to mention
                </h2>

                <div className="mt-6 grid gap-3">
                  <div className="metric-card">
                    <p className="section-label">Primary agent</p>
                    <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                      {leadAgent.name}
                    </p>
                    <p className="mt-2 font-mono text-xs text-slate-500">
                      {leadAgent.wallet}
                    </p>
                  </div>
                  <div className="metric-card">
                    <p className="section-label">Second comparison agent</p>
                    <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                      {secondAgent.name}
                    </p>
                    <p className="mt-2 font-mono text-xs text-slate-500">
                      {secondAgent.wallet}
                    </p>
                  </div>
                  <div className="metric-card">
                    <p className="section-label">Review deposit policy</p>
                    <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                      {formatCurrency(reviewDepositPolicy.amountUsd)}
                    </p>
                    <p className="mt-2 font-mono text-xs text-slate-500">
                      {reviewDepositPolicy.wallet}
                    </p>
                  </div>
                  <div className="metric-card">
                    <p className="section-label">Current network totals</p>
                    <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                      {formatCurrency(snapshot.totals.earningsUsd)} tracked volume
                    </p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {formatNumber(snapshot.totals.attestations)} stored attestations across the indexed network.
                    </p>
                  </div>
                </div>
              </div>

              <div className="surface-card-dark rounded-[1.9rem] p-6 text-white sm:p-8">
                <div className="eyebrow eyebrow-dark">
                  <ChartLineUp size={16} weight="duotone" />
                  Why this design works
                </div>
                <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
                  <p>
                    Payments are not an afterthought. They are the trigger that unlocks identity,
                    attestation, and reputation.
                  </p>
                  <p>
                    The story is also easy to understand live: compare agents, pay
                    one of them, verify the receipt, sign the review, and watch the
                    profile update.
                  </p>
                  <p>
                    That makes Credence feel like infrastructure for the agent
                    economy rather than a narrow one-off tool.
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/app" className="btn-secondary-dark">
                    Enter product
                  </Link>
                  <Link href="/app#verifier" className="btn-secondary-dark">
                    Open verifier tools
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
