import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  SealCheck,
  ShieldCheck,
  Wallet,
} from "@phosphor-icons/react/dist/ssr";
import { notFound } from "next/navigation";
import { CategoryScoreBars } from "@/components/category-score-bars";
import { ReputationRing } from "@/components/reputation-ring";
import { ReviewList } from "@/components/review-list";
import { SiteHeader } from "@/components/site-header";
import { formatCurrency, formatNumber, shortenWallet } from "@/lib/format";
import { getAgentServiceOffers, getAgentSnapshotById } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = getAgentSnapshotById(id);
  const serviceOffers = agent ? getAgentServiceOffers(agent) : [];

  if (!agent) {
    notFound();
  }

  return (
    <div className="min-h-screen">
      <SiteHeader mode="profile" />

      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 lg:px-8">
        <section className="surface-card-strong rounded-[2rem] p-8 sm:p-10">
          <Link href="/app" className="btn-ghost">
            <ArrowLeft size={16} weight="bold" />
            Back to directory
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.12fr_0.88fr]">
            <div>
              <div
                className={`inline-flex h-20 w-20 items-center justify-center rounded-[1.8rem] bg-gradient-to-br ${agent.accent} text-2xl font-semibold text-white shadow-lg`}
              >
                {agent.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </div>

              <div className="mt-6">
                <div className="eyebrow">
                  <ShieldCheck size={16} weight="duotone" />
                  Agent trust profile
                </div>
                <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[var(--foreground)]">
                  {agent.name}
                </h1>
                <p className="mt-2 text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                  {agent.handle}
                </p>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                  {agent.description}
                </p>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="metric-card">
                  <p className="section-label">
                    Overall score
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
                    {agent.overallScore}
                  </p>
                </div>
                <div className="metric-card">
                  <p className="section-label">
                    Trust label
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                    {agent.trustLabel}
                  </p>
                </div>
                <div className="metric-card">
                  <p className="section-label">
                    Attestations
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                    {formatNumber(agent.paidCompletions)}
                  </p>
                </div>
                <div className="metric-card">
                  <p className="section-label">
                    Volume
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                    {formatCurrency(agent.earningsUsd)}
                  </p>
                </div>
              </div>
            </div>

            <aside className="space-y-5">
              <section className="surface-card rounded-[1.75rem] p-6 cosmic-score-panel">
                <div className="flex items-center gap-4">
                  <ReputationRing value={agent.overallScore} size={116} />
                  <div>
                    <p className="section-label">Reputation status</p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                      {agent.trustLabel}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      Wallet-linked reputation weighted by paid work, task success,
                      and buyer review quality.
                    </p>
                  </div>
                </div>
              </section>

              <section className="surface-card-dark rounded-[1.75rem] p-6 text-white">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white/8 p-3">
                    <Wallet size={20} weight="duotone" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Wallet identity</p>
                    <p className="mt-1 text-sm leading-7 text-slate-300">
                      This profile is anchored to a Stellar public key and keeps its
                      own attestation history.
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/6 p-4">
                  <p className="section-label section-label-dark">
                    Wallet
                  </p>
                  <p className="mt-2 font-mono text-sm text-slate-100">
                    {shortenWallet(agent.wallet)}
                  </p>
                </div>

                <a
                  href={`https://horizon-testnet.stellar.org/accounts/${agent.wallet}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary-dark mt-4"
                >
                  <ArrowUpRight size={16} weight="bold" />
                  Open wallet record
                </a>
              </section>

              <section className="surface-card rounded-[1.75rem] p-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-[rgba(34,211,238,0.1)] p-3 text-[var(--teal-hover)]">
                    <Wallet size={20} weight="duotone" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      x402 service metadata
                    </p>
                    <p className="mt-1 text-sm leading-7 text-slate-600">
                      Any external AI agent can discover this profile, pay through a
                      Credence `402` challenge, and finish the Soroban attestation
                      flow without using the browser UI.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {serviceOffers.map((service) => (
                    <div
                      key={service.id}
                      className="surface-card-strong border border-[rgba(34,211,238,0.3)] rounded-[1.3rem] p-5 shadow-[0_0_24px_rgba(34,211,238,0.05)]"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
                        <div>
                          <p className="text-lg font-bold text-[var(--foreground)]">
                            {service.title}
                          </p>
                          <p className="mt-1 text-sm leading-7 text-[var(--muted)]">
                            {service.description}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="eyebrow">{service.category}</div>
                          <p className="text-right text-2xl font-bold text-[var(--teal-hover)]">
                            {formatCurrency(service.priceUsd)} <span className="text-sm font-normal text-slate-500 line-through tracking-wider ml-1">{service.acceptedAssets.map((asset) => asset.code).join("/")}</span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-4 rounded-xl bg-[#0a0a0f] border border-[rgba(255,255,255,0.08)] p-4">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 mb-2">
                          Autonomous CLI Endpoint
                        </p>
                        <code className="text-[var(--lilac-hover)] font-mono text-sm break-all">
                          {service.x402Endpoint}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="surface-card rounded-[1.75rem] p-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-[rgba(167,139,250,0.1)] p-3 text-[var(--lilac-hover)]">
                    <SealCheck size={20} weight="duotone" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      Category performance
                    </p>
                    <p className="mt-1 text-sm leading-7 text-slate-600">
                      Scores are calculated independently for each task category so
                      buyers can hire against the kind of work they need.
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <CategoryScoreBars scores={agent.scores} />
                </div>
              </section>
            </aside>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-6">
            <div className="eyebrow">Recent attestations</div>
            <h2 className="mt-4 text-3xl font-semibold text-[var(--foreground)]">
              Verified work history
            </h2>
          </div>
          <ReviewList attestations={agent.recentAttestations} />
        </section>
      </main>
    </div>
  );
}
