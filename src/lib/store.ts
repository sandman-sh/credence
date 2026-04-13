import { randomUUID } from "node:crypto";
import {
  Agent,
  AgentServiceOffer,
  AgentSnapshot,
  Attestation,
  CategoryScores,
  Dispute,
  HireAgentRequest,
  MarketplaceAgentListing,
  MarketplaceSnapshot,
  PaymentSplit,
  PaidTaskJob,
  PaidTaskRequest,
  PaymentVerification,
  ReviewRequest,
  SupportedPaymentAsset,
  TaskCategory,
  VerifierSummary,
  taskCategories,
} from "@/lib/types";
import { scoreToTone } from "@/lib/format";
import { getDatabase, mapAgentRow, mapAttestationRow, mapDisputeRow, mapJobRow } from "@/lib/database";
import { isValidStellarAddress, verifyTestnetPaymentProof } from "@/lib/stellar";
import {
  getCredenceContractId,
  hasCredenceContract,
  listOnchainAttestationsForAgent,
} from "@/lib/credence-contract";

const seedAgents: Agent[] = [
  {
    id: "aurora-bench",
    name: "Aurora Bench",
    handle: "@aurora.research",
    wallet: "GBEPMSQFVXNJQ6OCV7MRZURWAHRNIWNKXAH3UGNT6RUR5M2UTRG2G4YJ",
    headline: "Research agent for market scans and structured briefings",
    description:
      "Aurora specializes in rapid competitive synthesis, investor updates, and crisp decision memos with confidence signals.",
    specialties: ["research", "analysis"],
    baseRateUsd: 1.6,
    location: "Stellar testnet",
    responseTime: "~45 seconds",
    accent: "from-orange-300 via-rose-500 to-fuchsia-600",
  },
  {
    id: "vector-forge",
    name: "Vector Forge",
    handle: "@vector.coding",
    wallet: "GA5HNUIGL7WR4ABYWSOYYWFYLTLQPT3IEFYTVKPQZMKE4A4TG52GUYB5",
    headline: "Code agent for product scaffolds, API routes, and quick fixes",
    description:
      "Vector turns prompts into shippable product slices, with especially strong performance on MVP architecture and implementation.",
    specialties: ["coding", "analysis"],
    baseRateUsd: 2.2,
    location: "Stellar testnet",
    responseTime: "~60 seconds",
    accent: "from-violet-300 via-indigo-500 to-slate-900",
  },
  {
    id: "lingua-signal",
    name: "Lingua Signal",
    handle: "@lingua.translation",
    wallet: "GCNKNSNDTZ43HRI4BA5SFDYDIIAUYVZRWAO44HWAS3FNIUBWNRSXP4O5",
    headline: "Language agent for translation, localization, and tone matching",
    description:
      "Lingua focuses on high-context translation, multilingual summaries, and preserving tone across customer-facing content.",
    specialties: ["translation", "research"],
    baseRateUsd: 1.2,
    location: "Stellar testnet",
    responseTime: "~35 seconds",
    accent: "from-amber-200 via-orange-400 to-red-500",
  },
];

const seedAttestations: Attestation[] = [
  {
    id: "att_001",
    agentId: "aurora-bench",
    agentWallet: seedAgents[0].wallet,
    buyerWallet: "GBUYER72AA19MK4QPTT72W5SAMPLE11111111111111",
    paymentTxHash: "tx_research_001",
    taskCategory: "research",
    amountPaid: 2.4,
    success: true,
    reviewRating: 5,
    timestamp: "2026-04-06T08:10:00.000Z",
    comment: "Fast sourcing and a very sharp conclusion.",
    taskSummary: "Summarized three stablecoin entrants and market white space.",
  },
  {
    id: "att_002",
    agentId: "aurora-bench",
    agentWallet: seedAgents[0].wallet,
    buyerWallet: "GBUYER21TT55LM8QPTA11W5SAMPLE22222222222222",
    paymentTxHash: "tx_analysis_002",
    taskCategory: "analysis",
    amountPaid: 1.8,
    success: true,
    reviewRating: 4,
    timestamp: "2026-04-05T11:40:00.000Z",
    comment: "Great framing, would have liked one more scenario.",
    taskSummary: "Built a launch-risk memo for a payments API release.",
  },
  {
    id: "att_003",
    agentId: "aurora-bench",
    agentWallet: seedAgents[0].wallet,
    buyerWallet: "GBUYER66PL82MN7QPTC31W5SAMPLE33333333333333",
    paymentTxHash: "tx_research_003",
    taskCategory: "research",
    amountPaid: 3.1,
    success: true,
    reviewRating: 5,
    timestamp: "2026-04-04T14:15:00.000Z",
    comment: "Exactly the memo we needed for the pitch deck.",
    taskSummary: "Created investor-grade research on cross-border remittance trends.",
  },
  {
    id: "att_004",
    agentId: "vector-forge",
    agentWallet: seedAgents[1].wallet,
    buyerWallet: "GBUYER19AA41PM7QPTY11W5SAMPLE44444444444444",
    paymentTxHash: "tx_coding_004",
    taskCategory: "coding",
    amountPaid: 4.2,
    success: true,
    reviewRating: 5,
    timestamp: "2026-04-06T15:55:00.000Z",
    comment: "Shipped the route handler cleanly with almost no edits.",
    taskSummary: "Implemented a paid API route and response model.",
  },
  {
    id: "att_005",
    agentId: "vector-forge",
    agentWallet: seedAgents[1].wallet,
    buyerWallet: "GBUYER27QQ24QM6QPTS33W5SAMPLE55555555555555",
    paymentTxHash: "tx_analysis_005",
    taskCategory: "analysis",
    amountPaid: 2.1,
    success: true,
    reviewRating: 4,
    timestamp: "2026-04-05T18:30:00.000Z",
    comment: "Great architecture recommendation and tradeoff callouts.",
    taskSummary: "Reviewed API service architecture for latency and scale risks.",
  },
  {
    id: "att_006",
    agentId: "vector-forge",
    agentWallet: seedAgents[1].wallet,
    buyerWallet: "GBUYER91PP10QR9QPTU42W5SAMPLE66666666666666",
    paymentTxHash: "tx_coding_006",
    taskCategory: "coding",
    amountPaid: 3.6,
    success: true,
    reviewRating: 5,
    timestamp: "2026-04-03T20:05:00.000Z",
    comment: "Reliable output with strong code comments and types.",
    taskSummary: "Scaffolded a profile dashboard with real data bindings.",
  },
  {
    id: "att_007",
    agentId: "lingua-signal",
    agentWallet: seedAgents[2].wallet,
    buyerWallet: "GBUYER56KK88TR2QPTX19W5SAMPLE77777777777777",
    paymentTxHash: "tx_translation_007",
    taskCategory: "translation",
    amountPaid: 1.5,
    success: true,
    reviewRating: 5,
    timestamp: "2026-04-06T10:45:00.000Z",
    comment: "Natural tone and zero awkward phrasing.",
    taskSummary: "Translated a product update into Spanish and Hindi.",
  },
  {
    id: "att_008",
    agentId: "lingua-signal",
    agentWallet: seedAgents[2].wallet,
    buyerWallet: "GBUYER30GH61YU1QPTV72W5SAMPLE88888888888888",
    paymentTxHash: "tx_research_008",
    taskCategory: "research",
    amountPaid: 1.2,
    success: true,
    reviewRating: 4,
    timestamp: "2026-04-05T07:00:00.000Z",
    comment: "Good summary with strong international context.",
    taskSummary: "Researched multilingual onboarding patterns for fintech apps.",
  },
  {
    id: "att_009",
    agentId: "lingua-signal",
    agentWallet: seedAgents[2].wallet,
    buyerWallet: "GBUYER10NM22YU7QPTZ42W5SAMPLE99999999999999",
    paymentTxHash: "tx_translation_009",
    taskCategory: "translation",
    amountPaid: 1.7,
    success: true,
    reviewRating: 5,
    timestamp: "2026-04-04T13:20:00.000Z",
    comment: "Tone matching was excellent for customer email copy.",
    taskSummary: "Localized a customer support knowledge base article.",
  },
];

const minimumAmountByCategory: Record<TaskCategory, number> = {
  research: 1.0,
  coding: 1.5,
  translation: 0.75,
  analysis: 1.0,
};

const DEFAULT_REVIEW_DEPOSIT_USD = Number(
  process.env.NEXT_PUBLIC_CREDENCE_REVIEW_DEPOSIT_USD ?? "0.25",
);
const DEFAULT_REVIEW_DEPOSIT_WALLET =
  process.env.NEXT_PUBLIC_CREDENCE_REVIEW_DEPOSIT_WALLET?.trim().toUpperCase() ||
  process.env.CREDENCE_REVIEW_DEPOSIT_WALLET?.trim().toUpperCase() ||
  "GDOZKUS77S5AHKGN5NUQEYQJXIROQGJNRL4RTGGP2DCXVRO3K3NOBPKP";
const TESTNET_USDC_ISSUER =
  process.env.CREDENCE_TESTNET_USDC_ISSUER?.trim().toUpperCase() ||
  process.env.NEXT_PUBLIC_CREDENCE_TESTNET_USDC_ISSUER?.trim().toUpperCase() ||
  "";
const DEFAULT_PLATFORM_FEE_WALLET =
  process.env.CREDENCE_PLATFORM_FEE_WALLET?.trim().toUpperCase() ||
  process.env.NEXT_PUBLIC_CREDENCE_PLATFORM_FEE_WALLET?.trim().toUpperCase() ||
  "GDOZKUS77S5AHKGN5NUQEYQJXIROQGJNRL4RTGGP2DCXVRO3K3NOBPKP";
const DEFAULT_DISPUTE_RESERVE_WALLET =
  process.env.CREDENCE_DISPUTE_RESERVE_WALLET?.trim().toUpperCase() ||
  process.env.NEXT_PUBLIC_CREDENCE_DISPUTE_RESERVE_WALLET?.trim().toUpperCase() ||
  DEFAULT_REVIEW_DEPOSIT_WALLET;

function createEmptyScores(): CategoryScores {
  return {
    research: 0,
    coding: 0,
    translation: 0,
    analysis: 0,
  };
}

function getDaysSince(value: string) {
  const millis = Date.now() - new Date(value).getTime();
  return Math.max(millis / (1000 * 60 * 60 * 24), 0);
}

function computeCategoryScore(attestations: Attestation[]) {
  if (attestations.length === 0) return 0;

  const ratingAverage =
    attestations.reduce((sum, item) => sum + item.reviewRating, 0) /
    attestations.length;
  const successRate =
    attestations.filter((item) => item.success).length / attestations.length;
  const totalEarned = attestations.reduce((sum, item) => sum + item.amountPaid, 0);
  const latest = Math.min(...attestations.map((item) => getDaysSince(item.timestamp)));

  const normalizedAverageRating = (ratingAverage / 5) * 100;
  const successRateScore = successRate * 100;
  const volumeScore = Math.min(attestations.length / 12, 1) * 100;
  const earningsScore = Math.min(totalEarned / 30, 1) * 100;
  const recencyScore = Math.max(100 - latest * 4, 35);

  return Math.round(
    normalizedAverageRating * 0.45 +
      successRateScore * 0.25 +
      volumeScore * 0.15 +
      earningsScore * 0.1 +
      recencyScore * 0.05,
  );
}

function computeAgentSnapshot(agent: Agent, attestations: Attestation[]): AgentSnapshot {
  const scores = createEmptyScores();

  for (const category of taskCategories) {
    scores[category] = computeCategoryScore(
      attestations.filter((item) => item.taskCategory === category),
    );
  }

  const paidCompletions = attestations.length;
  const earningsUsd = attestations.reduce((sum, item) => sum + item.amountPaid, 0);
  const averageRating =
    paidCompletions === 0
      ? 0
      : attestations.reduce((sum, item) => sum + item.reviewRating, 0) /
        paidCompletions;
  const successRate =
    paidCompletions === 0
      ? 0
      : attestations.filter((item) => item.success).length / paidCompletions;

  const weightedCategories = taskCategories.filter((category) => scores[category] > 0);
  const overallScore =
    weightedCategories.length === 0
      ? 0
      : Math.round(
          weightedCategories.reduce((sum, category) => sum + scores[category], 0) /
            weightedCategories.length,
        );

  return {
    ...agent,
    scores,
    overallScore,
    trustLabel: scoreToTone(overallScore),
    paidCompletions,
    earningsUsd,
    averageRating: Number(averageRating.toFixed(1)),
    successRate: Math.round(successRate * 100),
    recentAttestations: [...attestations]
      .sort(
        (left, right) =>
          new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
      )
      .slice(0, 4),
  };
}

async function createTaskResult(agent: Agent, category: TaskCategory, prompt: string) {
  const normalizedPrompt = prompt.trim();
  const compactPrompt =
    normalizedPrompt.length > 160
      ? `${normalizedPrompt.slice(0, 157).trimEnd()}...`
      : normalizedPrompt;

  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini", // Fall back to fast cheap model
          messages: [
            {
              role: "system",
              content: `You are an AI specialized agent executing on the Credence platform. \nYour agent name is: ${agent.name}.\nYour core specialty is: ${category}. \nRespond clearly and concisely to the prompt strictly from the perspective of this persona.`,
            },
            {
              role: "user",
              content: normalizedPrompt,
            },
          ],
          max_tokens: 400,
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        const content = payload.choices?.[0]?.message?.content;
        if (content) {
          return content.trim();
        }
      }
    } catch (err) {
      // Fallback silently if the AI fetch times out or fails
      console.error("Live AI completion failed, falling back to simulated output.", err);
    }
  }

  // Fallback simulator if no API key is provided
  switch (category) {
    case "research":
      return `${agent.name} scanned the request and returned a concise market brief for "${compactPrompt}". Key takeaways: demand is strongest where buyers can verify prior work, category-specific trust signals matter more than generic ratings, and payment-backed reviews create a cleaner market than self-claimed skill lists.`;
    case "coding":
      return `${agent.name} produced an implementation plan for "${compactPrompt}". Recommended build: App Router frontend, verifier API, paid task route, buyer-signed attestation flow, and a Soroban-backed proof write tied to the Stellar testnet payment receipt.`;
    case "translation":
      return `${agent.name} translated the request into a user-ready tone for "${compactPrompt}". Output preserves intent, removes awkward phrasing, and keeps the product message polished across languages.`;
    case "analysis":
      return `${agent.name} analyzed "${compactPrompt}" and flagged the core signal: buyers trust proof over promises. Recommended action is to surface paid completions, category scores, and verified attestations above generic agent descriptions.`;
    default:
      return `${agent.name} completed the paid task for "${compactPrompt}".`;
  }
}

function normalizeWallet(wallet: string) {
  return wallet.trim().toUpperCase();
}

function minimumAmountForCategory(category: TaskCategory) {
  return minimumAmountByCategory[category];
}

export function getMinimumAmountForCategory(category: TaskCategory) {
  return minimumAmountForCategory(category);
}

export function getReviewDepositPolicy() {
  return {
    amountUsd: DEFAULT_REVIEW_DEPOSIT_USD,
    wallet: DEFAULT_REVIEW_DEPOSIT_WALLET,
  };
}

export function getMppSettlementWallets() {
  return {
    platformFeeWallet: DEFAULT_PLATFORM_FEE_WALLET,
    disputeReserveWallet: DEFAULT_DISPUTE_RESERVE_WALLET,
  };
}

export function getMppSettlementPlan(input: {
  agentWallet: string;
  amountUsd: number;
  asset: string;
}): PaymentSplit[] {
  const total = Number(input.amountUsd.toFixed(7));
  const agentAmount = Number((total * 0.75).toFixed(7));
  const platformAmount = Number((total * 0.15).toFixed(7));
  const reserveAmount = Number((total - agentAmount - platformAmount).toFixed(7));
  const { platformFeeWallet, disputeReserveWallet } = getMppSettlementWallets();

  return [
    {
      recipient: input.agentWallet,
      role: "agent",
      shareBps: 7500,
      amount: agentAmount.toFixed(7),
      asset: input.asset,
    },
    {
      recipient: platformFeeWallet,
      role: "platform",
      shareBps: 1500,
      amount: platformAmount.toFixed(7),
      asset: input.asset,
    },
    {
      recipient: disputeReserveWallet,
      role: "reserve",
      shareBps: 1000,
      amount: reserveAmount.toFixed(7),
      asset: input.asset,
    },
  ];
}

export function getSupportedPaymentAssets(amountUsd: number): SupportedPaymentAsset[] {
  const assets: SupportedPaymentAsset[] = [
    {
      code: "XLM",
      network: "stellar:testnet",
      amount: amountUsd.toFixed(2),
      decimals: 7,
    },
  ];

  if (TESTNET_USDC_ISSUER) {
    assets.push({
      code: "USDC",
      issuer: TESTNET_USDC_ISSUER,
      network: "stellar:testnet",
      amount: amountUsd.toFixed(2),
      decimals: 7,
    });
  }

  return assets;
}

export function getAgentServiceOffers(
  agent: Pick<AgentSnapshot, "id" | "name" | "headline" | "specialties" | "baseRateUsd" | "responseTime">,
  origin = "",
): AgentServiceOffer[] {
  return agent.specialties.map((category) => ({
    id: `${agent.id}-${category}`,
    title: `${agent.name} ${category} service`,
    description: `${agent.headline} Paid ${category} execution unlocked through Credence x402.`,
    category,
    priceUsd: agent.baseRateUsd,
    estimatedDuration: agent.responseTime,
    acceptedAssets: getSupportedPaymentAssets(agent.baseRateUsd),
    x402Endpoint: `${origin}/api/hire-agent/${agent.id}`,
    outputSchema: "credence/hire-agent-result@v1",
  }));
}

function readAgents() {
  ensureDatabaseState();
  const db = getDatabase();
  const rows = db.prepare("SELECT * FROM agents ORDER BY name ASC").all() as Record<
    string,
    unknown
  >[];
  return rows.map(mapAgentRow);
}

function readAttestations() {
  ensureDatabaseState();
  const db = getDatabase();
  const rows = db
    .prepare("SELECT * FROM attestations ORDER BY datetime(timestamp) DESC")
    .all() as Record<string, unknown>[];
  return rows.map(mapAttestationRow);
}

function ensureDatabaseState() {
  const db = getDatabase();

  const count = db.prepare("SELECT COUNT(*) AS count FROM agents").get() as {
    count: number;
  };

  const insertAgent = db.prepare(`
    INSERT OR REPLACE INTO agents (
      id,
      name,
      handle,
      wallet,
      headline,
      description,
      specialties_json,
      base_rate_usd,
      location,
      response_time,
      accent
    ) VALUES (
      @id,
      @name,
      @handle,
      @wallet,
      @headline,
      @description,
      @specialties_json,
      @base_rate_usd,
      @location,
      @response_time,
      @accent
    )
  `);

  const insertAttestation = db.prepare(`
    INSERT OR IGNORE INTO attestations (
      id,
      agent_id,
      agent_wallet,
      buyer_wallet,
      review_nonce,
      payment_tx_hash,
      task_category,
      amount_paid,
      success,
      review_rating,
      timestamp,
      comment,
      task_summary,
      integrity_score,
      integrity_notes_json
    ) VALUES (
      @id,
      @agent_id,
      @agent_wallet,
      @buyer_wallet,
      @review_nonce,
      @payment_tx_hash,
      @task_category,
      @amount_paid,
      @success,
      @review_rating,
      @timestamp,
      @comment,
      @task_summary,
      @integrity_score,
      @integrity_notes_json
    )
  `);

  if (count.count === 0) {
    const seedTransaction = db.transaction(() => {
      for (const agent of seedAgents) {
        insertAgent.run({
          id: agent.id,
          name: agent.name,
          handle: agent.handle,
          wallet: agent.wallet,
          headline: agent.headline,
          description: agent.description,
          specialties_json: JSON.stringify(agent.specialties),
          base_rate_usd: agent.baseRateUsd,
          location: agent.location,
          response_time: agent.responseTime,
          accent: agent.accent,
        });
      }

      for (const attestation of seedAttestations) {
        insertAttestation.run({
          id: attestation.id,
          agent_id: attestation.agentId,
          agent_wallet: attestation.agentWallet,
          buyer_wallet: attestation.buyerWallet,
          review_nonce: `seed-${attestation.id}`,
          payment_tx_hash: attestation.paymentTxHash,
          task_category: attestation.taskCategory,
          amount_paid: attestation.amountPaid,
          success: attestation.success ? 1 : 0,
          review_rating: attestation.reviewRating,
          timestamp: attestation.timestamp,
          comment: attestation.comment,
          task_summary: attestation.taskSummary,
          integrity_score: 82,
          integrity_notes_json: JSON.stringify([
            "Seeded marketplace baseline",
            "Not contract-written",
          ]),
        });
      }
    });

    seedTransaction();
  }

  for (const agent of seedAgents) {
    if (!isValidStellarAddress(agent.wallet)) {
      continue;
    }

    db.prepare(
      `
        UPDATE agents
        SET wallet = @wallet
        WHERE id = @id
          AND wallet != @wallet
      `,
    ).run({
      id: agent.id,
      wallet: agent.wallet,
    });

    db.prepare(
      `
        UPDATE attestations
        SET agent_wallet = @wallet
        WHERE agent_id = @id
          AND agent_wallet != @wallet
      `,
    ).run({
      id: agent.id,
      wallet: agent.wallet,
    });

    db.prepare(
      `
        UPDATE jobs
        SET agent_wallet = @wallet
        WHERE agent_id = @id
          AND agent_wallet != @wallet
      `,
    ).run({
      id: agent.id,
      wallet: agent.wallet,
    });
  }
}

function getIntegrityNotes(input: {
  amountPaid: number;
  minimumAmount: number;
  reviewSignature?: string;
  contractTxHash?: string;
  reviewDepositTxHash?: string;
}) {
  const notes = [
    "Receipt verified on Stellar testnet",
    `Minimum anti-spam threshold cleared (${input.minimumAmount.toFixed(2)} USD)`,
  ];

  if (input.reviewDepositTxHash) {
    notes.push("Buyer review deposit verified");
  }

  if (input.reviewSignature) {
    notes.push("Buyer-signed wallet review attached");
  }

  if (input.contractTxHash) {
    notes.push("Attestation committed through Soroban");
  }

  return notes;
}

function computeIntegrityScore(input: {
  amountPaid: number;
  minimumAmount: number;
  reviewSignature?: string;
  contractTxHash?: string;
  reviewDepositTxHash?: string;
}) {
  let score = 72;
  score += Math.min(Math.round((input.amountPaid / input.minimumAmount) * 8), 12);

  if (input.reviewDepositTxHash) {
    score += 6;
  }

  if (input.reviewSignature) {
    score += 8;
  }

  if (input.contractTxHash) {
    score += 8;
  }

  return Math.min(score, 100);
}

function requireCommercialThreshold(category: TaskCategory, amountPaid: number) {
  const minimumAmount = minimumAmountForCategory(category);
  if (amountPaid < minimumAmount) {
    throw new Error(
      `This category requires at least ${minimumAmount.toFixed(2)} USD in verified payment volume before a review can count.`,
    );
  }

  return minimumAmount;
}

function enforceAntiSpamRules(input: {
  agentId: string;
  buyerWallet: string;
  taskCategory: TaskCategory;
  paymentTxHash: string;
}) {
  const db = getDatabase();
  const sameBuyerInDay = db
    .prepare(
      `
        SELECT COUNT(*) AS count
        FROM attestations
        WHERE agent_id = ?
          AND buyer_wallet = ?
          AND datetime(timestamp) >= datetime('now', '-1 day')
      `,
    )
    .get(input.agentId, input.buyerWallet) as { count: number };

  if (sameBuyerInDay.count >= 3) {
    throw new Error("Daily attestation limit reached for this buyer and agent pair.");
  }

  const sameCategoryCooldown = db
    .prepare(
      `
        SELECT COUNT(*) AS count
        FROM jobs
        WHERE agent_id = ?
          AND buyer_wallet = ?
          AND task_category = ?
          AND payment_tx_hash != ?
          AND datetime(created_at) >= datetime('now', '-10 minutes')
      `,
    )
    .get(
      input.agentId,
      input.buyerWallet,
      input.taskCategory,
      input.paymentTxHash,
    ) as { count: number };

  if (sameCategoryCooldown.count > 0) {
    throw new Error(
      "Please wait a few minutes before issuing another paid task in the same category for this agent.",
    );
  }
}

export function getMarketplaceSnapshot(): MarketplaceSnapshot {
  const agents = readAgents()
    .map((agent) =>
      computeAgentSnapshot(
        agent,
        readAttestations().filter((item) => item.agentId === agent.id),
      ),
    )
    .sort((left, right) => right.overallScore - left.overallScore);

  const recentAttestations = readAttestations().slice(0, 6);

  return {
    network: "Stellar testnet",
    trustMode:
      process.env.NEXT_PUBLIC_CREDENCE_ATTESTATION_CONTRACT_ID ||
      process.env.CREDENCE_ATTESTATION_CONTRACT_ID
        ? "contract-backed"
        : "receipt-verified",
    agents,
    recentAttestations,
    featuredPair: [agents[0], agents[1]],
    totals: {
      paidCompletions: agents.reduce((sum, agent) => sum + agent.paidCompletions, 0),
      earningsUsd: Number(
        agents.reduce((sum, agent) => sum + agent.earningsUsd, 0).toFixed(2),
      ),
      attestations: readAttestations().length,
    },
  };
}

export function getMarketplaceListings(origin = ""): MarketplaceAgentListing[] {
  return getMarketplaceSnapshot().agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    handle: agent.handle,
    wallet: agent.wallet,
    headline: agent.headline,
    description: agent.description,
    specialties: agent.specialties,
    overallScore: agent.overallScore,
    trustLabel: agent.trustLabel,
    averageRating: agent.averageRating,
    paidCompletions: agent.paidCompletions,
    earningsUsd: agent.earningsUsd,
    baseRateUsd: agent.baseRateUsd,
    responseTime: agent.responseTime,
    categoryScores: agent.scores,
    x402: {
      endpoint: `${origin}/api/hire-agent/${agent.id}`,
      network: "stellar:testnet",
      acceptedAssets: getSupportedPaymentAssets(agent.baseRateUsd),
      services: getAgentServiceOffers(agent, origin),
    },
  }));
}

export function getAgentSnapshotById(id: string) {
  const agent = readAgents().find((item) => item.id === id);
  if (!agent) return null;

  return computeAgentSnapshot(
    agent,
    readAttestations().filter((item) => item.agentId === agent.id),
  );
}

export function getVerifierSummaryByWallet(wallet: string): VerifierSummary | null {
  const agent = readAgents().find((item) => item.wallet === wallet);
  if (!agent) return null;

  const snapshot = getAgentSnapshotById(agent.id);
  if (!snapshot) return null;

  return {
    agentWallet: snapshot.wallet,
    agentId: snapshot.id,
    overallScore: snapshot.overallScore,
    trustLabel: snapshot.trustLabel,
    categories: snapshot.scores,
    paidCompletions: snapshot.paidCompletions,
    earningsUsd: snapshot.earningsUsd,
    averageRating: snapshot.averageRating,
    successRate: snapshot.successRate,
    recentReviews: snapshot.recentAttestations,
  };
}

export async function syncOnchainAttestationsForWallet(wallet: string) {
  if (!hasCredenceContract()) {
    return null;
  }

  const db = getDatabase();
  const agent = readAgents().find((item) => item.wallet === wallet);
  if (!agent) {
    return null;
  }

  const onchainAttestations = await listOnchainAttestationsForAgent(wallet);
  const insertStatement = db.prepare(
    `
      INSERT OR IGNORE INTO attestations (
        id,
        agent_id,
        agent_wallet,
        buyer_wallet,
        review_nonce,
        payment_tx_hash,
        task_category,
        amount_paid,
        success,
        review_rating,
        timestamp,
        comment,
        task_summary,
        verified_ledger,
        horizon_url,
        contract_id,
        integrity_score,
        integrity_notes_json
      ) VALUES (
        @id,
        @agent_id,
        @agent_wallet,
        @buyer_wallet,
        @review_nonce,
        @payment_tx_hash,
        @task_category,
        @amount_paid,
        @success,
        @review_rating,
        @timestamp,
        @comment,
        @task_summary,
        @verified_ledger,
        @horizon_url,
        @contract_id,
        @integrity_score,
        @integrity_notes_json
      )
    `,
  );

  for (const attestation of onchainAttestations) {
    insertStatement.run({
      id: `chain_${attestation.id}`,
      agent_id: agent.id,
      agent_wallet: agent.wallet,
      buyer_wallet: attestation.buyer,
      review_nonce: `chain-${attestation.id}`,
      payment_tx_hash: attestation.paymentTxHash,
      task_category: attestation.taskCategory,
      amount_paid: Number(attestation.amountPaidMicrousd) / 1_000_000,
      success: attestation.success ? 1 : 0,
      review_rating: attestation.reviewRating,
      timestamp: new Date(attestation.timestamp * 1000).toISOString(),
      comment: attestation.comment,
      task_summary: attestation.taskSummary,
      verified_ledger: attestation.verifiedLedger,
      horizon_url: attestation.horizonUrl,
      contract_id: getCredenceContractId(),
      integrity_score: 100,
      integrity_notes_json: JSON.stringify([
        "Synced from Soroban contract state",
        "Onchain attestation record present",
      ]),
    });
  }

  const indexedAttestations = readAttestations().filter(
    (item) => item.agentWallet === wallet,
  );
  const latestIndexedChainRecord = indexedAttestations.find((item) => item.contractId);

  return {
    contractId: getCredenceContractId(),
    source: "soroban-testnet" as const,
    syncedAt: new Date().toISOString(),
    onchainAttestationCount: onchainAttestations.length,
    indexedAttestationCount: indexedAttestations.length,
    latestContractLedger: latestIndexedChainRecord?.contractLedger,
    latestContractTxHash: latestIndexedChainRecord?.contractTxHash,
    syncedAttestations: onchainAttestations,
  };
}

export function getPaidTaskByReviewNonce(reviewNonce: string) {
  const db = getDatabase();
  const row = db
    .prepare("SELECT * FROM jobs WHERE review_nonce = ?")
    .get(reviewNonce) as Record<string, unknown> | undefined;

  return row ? mapJobRow(row) : null;
}

export function getPaidTaskByPaymentHash(paymentTxHash: string) {
  const db = getDatabase();
  const row = db
    .prepare("SELECT * FROM jobs WHERE payment_tx_hash = ?")
    .get(paymentTxHash) as Record<string, unknown> | undefined;

  return row ? mapJobRow(row) : null;
}

export function getAttestationByPaymentHash(paymentTxHash: string) {
  const db = getDatabase();
  const row = db
    .prepare("SELECT * FROM attestations WHERE payment_tx_hash = ?")
    .get(paymentTxHash) as Record<string, unknown> | undefined;

  return row ? mapAttestationRow(row) : null;
}

export function getBuyerTrustWeight(buyerWallet: string) {
  const normalized = normalizeWallet(buyerWallet);
  const buyerAgent = readAgents().find((item) => item.wallet === normalized);
  if (!buyerAgent) {
    return 1;
  }

  const snapshot = getAgentSnapshotById(buyerAgent.id);
  if (!snapshot) {
    return 1;
  }

  return Number(Math.min(Math.max(snapshot.overallScore / 80, 0.85), 1.35).toFixed(2));
}

export function buildAutonomousReview(input: {
  agent: Agent;
  request: HireAgentRequest;
  amountPaid: number;
}) {
  const success =
    input.request.success === undefined ? true : Boolean(input.request.success);
  const reviewRating =
    typeof input.request.reviewRating === "number"
      ? Math.min(Math.max(Math.round(input.request.reviewRating), 1), 5)
      : input.amountPaid >= input.agent.baseRateUsd
        ? 5
        : 4;

  const comment =
    input.request.comment?.trim() ||
    `${input.agent.name} completed an autonomous ${input.request.taskCategory} request through Credence x402 with a delivery that matched the paid prompt.`;

  return {
    success,
    reviewRating,
    comment,
  };
}

export async function createPaidTask(input: PaidTaskRequest) {
  const db = getDatabase();
  const agent = readAgents().find((item) => item.id === input.agentId);
  if (!agent) {
    throw new Error("Agent not found.");
  }

  const buyerWallet = normalizeWallet(input.buyerWallet);
  if (!buyerWallet) {
    throw new Error("Buyer wallet is required.");
  }

  if (!isValidStellarAddress(buyerWallet)) {
    throw new Error("Buyer wallet must be a valid Stellar public key.");
  }

  if (buyerWallet === agent.wallet) {
    throw new Error("Buyer wallet must be different from the agent wallet.");
  }

  const paymentTxHash = input.paymentTxHash.trim();
  if (!paymentTxHash) {
    throw new Error("Payment transaction hash is required.");
  }

  if (input.prompt.trim().length < 24) {
    throw new Error("Task request should be detailed enough to review later.");
  }

  const existingPayment = db
    .prepare(
      `
        SELECT EXISTS(SELECT 1 FROM jobs WHERE payment_tx_hash = ?) AS job_exists,
               EXISTS(SELECT 1 FROM attestations WHERE payment_tx_hash = ?) AS attestation_exists
      `,
    )
    .get(paymentTxHash, paymentTxHash) as {
    job_exists: number;
    attestation_exists: number;
  };

  if (existingPayment.job_exists || existingPayment.attestation_exists) {
    throw new Error("That payment transaction hash has already been used.");
  }

  const verification: PaymentVerification =
    input.verificationOverride ??
    (await verifyTestnetPaymentProof({
      buyerWallet,
      paymentTxHash,
      recipientWallet: agent.wallet,
      expectedMemo: input.expectedMemo,
      allowedAssets: input.allowedAssets,
    }));

  const verifiedAmount = Number(verification.transferredAmount);
  if (!Number.isFinite(verifiedAmount) || verifiedAmount <= 0) {
    throw new Error("Verified payment amount must be greater than zero.");
  }

  const minimumReviewAmount = requireCommercialThreshold(
    input.taskCategory,
    verifiedAmount,
  );

  enforceAntiSpamRules({
    agentId: agent.id,
    buyerWallet,
    taskCategory: input.taskCategory,
    paymentTxHash,
  });

  const job: PaidTaskJob = {
    id: `job_${Date.now()}`,
    agentId: agent.id,
    agentWallet: agent.wallet,
    buyerWallet,
    reviewNonce: randomUUID(),
    paymentTxHash,
    taskCategory: input.taskCategory,
    amountPaid: Number(verifiedAmount.toFixed(2)),
    prompt: input.prompt.trim(),
    createdAt: new Date().toISOString(),
    status: "completed",
    result: await createTaskResult(agent, input.taskCategory, input.prompt),
    minimumReviewAmount,
    reviewDepositUsd: DEFAULT_REVIEW_DEPOSIT_USD,
    reviewDepositWallet: DEFAULT_REVIEW_DEPOSIT_WALLET,
    integrityStatus: "verified",
    verification,
  };

  db.prepare(
    `
      INSERT INTO jobs (
        id,
        agent_id,
        agent_wallet,
        buyer_wallet,
        review_nonce,
        payment_tx_hash,
        task_category,
        amount_paid,
        prompt,
        created_at,
        status,
        result,
        minimum_review_amount,
        review_deposit_usd,
        review_deposit_wallet,
        integrity_status,
        verification_network,
        verification_source_account,
        verification_ledger,
        verification_created_at,
        verification_operation_count,
        verification_successful,
        verification_horizon_url
      ) VALUES (
        @id,
        @agent_id,
        @agent_wallet,
        @buyer_wallet,
        @review_nonce,
        @payment_tx_hash,
        @task_category,
        @amount_paid,
        @prompt,
        @created_at,
        @status,
        @result,
        @minimum_review_amount,
        @review_deposit_usd,
        @review_deposit_wallet,
        @integrity_status,
        @verification_network,
        @verification_source_account,
        @verification_ledger,
        @verification_created_at,
        @verification_operation_count,
        @verification_successful,
        @verification_horizon_url
      )
    `,
  ).run({
    id: job.id,
    agent_id: job.agentId,
    agent_wallet: job.agentWallet,
    buyer_wallet: job.buyerWallet,
    review_nonce: job.reviewNonce,
    payment_tx_hash: job.paymentTxHash,
    task_category: job.taskCategory,
    amount_paid: job.amountPaid,
    prompt: job.prompt,
    created_at: job.createdAt,
    status: job.status,
    result: job.result,
    minimum_review_amount: job.minimumReviewAmount,
    review_deposit_usd: job.reviewDepositUsd,
    review_deposit_wallet: job.reviewDepositWallet ?? null,
    integrity_status: job.integrityStatus,
    verification_network: job.verification.network,
    verification_source_account: job.verification.sourceAccount,
    verification_destination_account: job.verification.destinationAccount,
    verification_transferred_amount: job.verification.transferredAmount,
    verification_transferred_asset: job.verification.transferredAsset,
    verification_ledger: job.verification.ledger,
    verification_created_at: job.verification.createdAt,
    verification_operation_count: job.verification.operationCount,
    verification_successful: job.verification.successful ? 1 : 0,
    verification_horizon_url: job.verification.horizonUrl,
  });

  return job;
}

export async function submitReview(input: ReviewRequest) {
  const db = getDatabase();
  const agent = readAgents().find((item) => item.id === input.agentId);
  if (!agent) {
    throw new Error("Agent not found.");
  }

  const paymentTxHash = input.paymentTxHash.trim();
  const buyerWallet = normalizeWallet(input.buyerWallet);
  const reviewNonce = input.reviewNonce.trim();
  const job = getPaidTaskByReviewNonce(reviewNonce);

  if (!job) {
    throw new Error("No verified paid task found for this review.");
  }

  if (
    job.paymentTxHash !== paymentTxHash ||
    job.agentId !== input.agentId ||
    job.buyerWallet !== buyerWallet
  ) {
    throw new Error("Review details do not match the verified paid task.");
  }

  if (job.taskCategory !== input.taskCategory) {
    throw new Error("Review category must match the verified paid task.");
  }

  const existing = db
    .prepare("SELECT id FROM attestations WHERE payment_tx_hash = ?")
    .get(paymentTxHash) as { id: string } | undefined;
  if (existing) {
    throw new Error("A review already exists for this payment.");
  }

  if (input.reviewRating < 1 || input.reviewRating > 5) {
    throw new Error("Review rating must be between 1 and 5.");
  }

  if (input.comment.trim().length < 24) {
    throw new Error("Buyer review should include at least a short useful explanation.");
  }

  if (input.comment.trim().length > 320) {
    throw new Error("Buyer review should stay concise and readable.");
  }

  if (input.signerWallet && normalizeWallet(input.signerWallet) !== buyerWallet) {
    throw new Error("The wallet signature must come from the buyer wallet.");
  }

  if (job.reviewDepositUsd > 0) {
    if (!input.reviewDepositTxHash?.trim()) {
      throw new Error("A buyer review deposit transaction hash is required.");
    }
  }

  let reviewDepositTxHash: string | undefined;
  if (input.reviewDepositTxHash?.trim()) {
    reviewDepositTxHash = input.reviewDepositTxHash.trim();
    if (reviewDepositTxHash === paymentTxHash) {
      throw new Error("Review deposit must use a separate transaction hash.");
    }

    const depositAlreadyUsed = db
      .prepare("SELECT id FROM attestations WHERE review_deposit_tx_hash = ?")
      .get(reviewDepositTxHash) as { id: string } | undefined;

    if (depositAlreadyUsed) {
      throw new Error("That review deposit transaction hash has already been used.");
    }

    await verifyTestnetPaymentProof({
      buyerWallet,
      paymentTxHash: reviewDepositTxHash,
      recipientWallet: job.reviewDepositWallet ?? DEFAULT_REVIEW_DEPOSIT_WALLET,
    });
  }

  const integrityNotes = getIntegrityNotes({
    amountPaid: job.amountPaid,
    minimumAmount: job.minimumReviewAmount,
    reviewDepositTxHash,
    reviewSignature: input.reviewSignature,
    contractTxHash: input.contractTxHash,
  });
  const integrityScore = computeIntegrityScore({
    amountPaid: job.amountPaid,
    minimumAmount: job.minimumReviewAmount,
    reviewDepositTxHash,
    reviewSignature: input.reviewSignature,
    contractTxHash: input.contractTxHash,
  });

  const attestation: Attestation = {
    id: `att_${Date.now()}`,
    agentId: agent.id,
    agentWallet: agent.wallet,
    buyerWallet,
    reviewNonce,
    paymentTxHash,
    taskCategory: input.taskCategory,
    amountPaid: job.amountPaid,
    success: input.success,
    reviewRating: input.reviewRating,
    timestamp: new Date().toISOString(),
    comment: input.comment.trim(),
    taskSummary: job.result,
    verifiedLedger: job.verification.ledger,
    verifiedAt: job.verification.createdAt,
    horizonUrl: job.verification.horizonUrl,
    contractId: input.contractId,
    contractTxHash: input.contractTxHash,
    contractLedger: input.contractLedger,
    reviewDepositTxHash,
    signerWallet: input.signerWallet,
    reviewSignature: input.reviewSignature,
    integrityScore,
    integrityNotes,
  };

  db.prepare(
    `
      INSERT INTO attestations (
        id,
        agent_id,
        agent_wallet,
        buyer_wallet,
        review_nonce,
        payment_tx_hash,
        task_category,
        amount_paid,
        success,
        review_rating,
        timestamp,
        comment,
        task_summary,
        verified_ledger,
        verified_at,
        horizon_url,
        contract_id,
        contract_tx_hash,
        contract_ledger,
        review_deposit_tx_hash,
        signer_wallet,
        review_signature,
        integrity_score,
        integrity_notes_json
      ) VALUES (
        @id,
        @agent_id,
        @agent_wallet,
        @buyer_wallet,
        @review_nonce,
        @payment_tx_hash,
        @task_category,
        @amount_paid,
        @success,
        @review_rating,
        @timestamp,
        @comment,
        @task_summary,
        @verified_ledger,
        @verified_at,
        @horizon_url,
        @contract_id,
        @contract_tx_hash,
        @contract_ledger,
        @review_deposit_tx_hash,
        @signer_wallet,
        @review_signature,
        @integrity_score,
        @integrity_notes_json
      )
    `,
  ).run({
    id: attestation.id,
    agent_id: attestation.agentId,
    agent_wallet: attestation.agentWallet,
    buyer_wallet: attestation.buyerWallet,
    review_nonce: attestation.reviewNonce ?? null,
    payment_tx_hash: attestation.paymentTxHash,
    task_category: attestation.taskCategory,
    amount_paid: attestation.amountPaid,
    success: attestation.success ? 1 : 0,
    review_rating: attestation.reviewRating,
    timestamp: attestation.timestamp,
    comment: attestation.comment,
    task_summary: attestation.taskSummary,
    verified_ledger: attestation.verifiedLedger ?? null,
    verified_at: attestation.verifiedAt ?? null,
    horizon_url: attestation.horizonUrl ?? null,
    contract_id: attestation.contractId ?? null,
    contract_tx_hash: attestation.contractTxHash ?? null,
    contract_ledger: attestation.contractLedger ?? null,
    review_deposit_tx_hash: attestation.reviewDepositTxHash ?? null,
    signer_wallet: attestation.signerWallet ?? null,
    review_signature: attestation.reviewSignature ?? null,
    integrity_score: attestation.integrityScore ?? 100,
    integrity_notes_json: JSON.stringify(attestation.integrityNotes ?? []),
  });

  return {
    attestation,
    agent: getAgentSnapshotById(agent.id),
    marketplace: getMarketplaceSnapshot(),
  };
}

export async function submitAgenticReview(input: ReviewRequest) {
  const db = getDatabase();
  const agent = readAgents().find((item) => item.id === input.agentId);
  if (!agent) {
    throw new Error("Agent not found.");
  }

  const paymentTxHash = input.paymentTxHash.trim();
  const buyerWallet = normalizeWallet(input.buyerWallet);
  const reviewNonce = input.reviewNonce.trim();
  const job = getPaidTaskByReviewNonce(reviewNonce);

  if (!job) {
    throw new Error("No verified paid task found for this autonomous review.");
  }

  if (
    job.paymentTxHash !== paymentTxHash ||
    job.agentId !== input.agentId ||
    job.buyerWallet !== buyerWallet
  ) {
    throw new Error("Autonomous review details do not match the verified paid task.");
  }

  if (job.taskCategory !== input.taskCategory) {
    throw new Error("Autonomous review category must match the verified paid task.");
  }

  const existing = getAttestationByPaymentHash(paymentTxHash);
  if (existing) {
    return {
      attestation: existing,
      agent: getAgentSnapshotById(agent.id),
      marketplace: getMarketplaceSnapshot(),
    };
  }

  if (input.reviewRating < 1 || input.reviewRating > 5) {
    throw new Error("Review rating must be between 1 and 5.");
  }

  if (input.comment.trim().length < 16) {
    throw new Error("Autonomous review comment should include at least a short useful explanation.");
  }

  if (!input.contractTxHash || !input.contractId) {
    throw new Error("Autonomous reviews require a committed Soroban attestation.");
  }

  if (input.signerWallet && normalizeWallet(input.signerWallet) !== buyerWallet) {
    throw new Error("The attestation signature must come from the buyer wallet.");
  }

  const integrityNotes = getIntegrityNotes({
    amountPaid: job.amountPaid,
    minimumAmount: job.minimumReviewAmount,
    reviewSignature: input.reviewSignature,
    contractTxHash: input.contractTxHash,
  });
  const integrityScore = computeIntegrityScore({
    amountPaid: job.amountPaid,
    minimumAmount: job.minimumReviewAmount,
    reviewSignature: input.reviewSignature,
    contractTxHash: input.contractTxHash,
  });

  const attestation: Attestation = {
    id: `att_agentic_${Date.now()}`,
    agentId: agent.id,
    agentWallet: agent.wallet,
    buyerWallet,
    reviewNonce,
    paymentTxHash,
    taskCategory: input.taskCategory,
    amountPaid: job.amountPaid,
    success: input.success,
    reviewRating: input.reviewRating,
    timestamp: new Date().toISOString(),
    comment: input.comment.trim(),
    taskSummary: job.result,
    verifiedLedger: job.verification.ledger,
    verifiedAt: job.verification.createdAt,
    horizonUrl: job.verification.horizonUrl,
    contractId: input.contractId,
    contractTxHash: input.contractTxHash,
    contractLedger: input.contractLedger,
    signerWallet: input.signerWallet,
    reviewSignature: input.reviewSignature,
    integrityScore,
    integrityNotes,
  };

  db.prepare(
    `
      INSERT INTO attestations (
        id,
        agent_id,
        agent_wallet,
        buyer_wallet,
        review_nonce,
        payment_tx_hash,
        task_category,
        amount_paid,
        success,
        review_rating,
        timestamp,
        comment,
        task_summary,
        verified_ledger,
        verified_at,
        horizon_url,
        contract_id,
        contract_tx_hash,
        contract_ledger,
        signer_wallet,
        review_signature,
        integrity_score,
        integrity_notes_json
      ) VALUES (
        @id,
        @agent_id,
        @agent_wallet,
        @buyer_wallet,
        @review_nonce,
        @payment_tx_hash,
        @task_category,
        @amount_paid,
        @success,
        @review_rating,
        @timestamp,
        @comment,
        @task_summary,
        @verified_ledger,
        @verified_at,
        @horizon_url,
        @contract_id,
        @contract_tx_hash,
        @contract_ledger,
        @signer_wallet,
        @review_signature,
        @integrity_score,
        @integrity_notes_json
      )
    `,
  ).run({
    id: attestation.id,
    agent_id: attestation.agentId,
    agent_wallet: attestation.agentWallet,
    buyer_wallet: attestation.buyerWallet,
    review_nonce: attestation.reviewNonce ?? null,
    payment_tx_hash: attestation.paymentTxHash,
    task_category: attestation.taskCategory,
    amount_paid: attestation.amountPaid,
    success: attestation.success ? 1 : 0,
    review_rating: attestation.reviewRating,
    timestamp: attestation.timestamp,
    comment: attestation.comment,
    task_summary: attestation.taskSummary,
    verified_ledger: attestation.verifiedLedger ?? null,
    verified_at: attestation.verifiedAt ?? null,
    horizon_url: attestation.horizonUrl ?? null,
    contract_id: attestation.contractId ?? null,
    contract_tx_hash: attestation.contractTxHash ?? null,
    contract_ledger: attestation.contractLedger ?? null,
    signer_wallet: attestation.signerWallet ?? null,
    review_signature: attestation.reviewSignature ?? null,
    integrity_score: attestation.integrityScore ?? 100,
    integrity_notes_json: JSON.stringify(attestation.integrityNotes ?? []),
  });

  return {
    attestation,
    agent: getAgentSnapshotById(agent.id),
    marketplace: getMarketplaceSnapshot(),
  };
}

export function listDisputes(paymentTxHash?: string) {
  const db = getDatabase();
  const rows = paymentTxHash
    ? (db
        .prepare(
          "SELECT * FROM disputes WHERE payment_tx_hash = ? ORDER BY datetime(created_at) DESC",
        )
        .all(paymentTxHash) as Record<string, unknown>[])
    : (db
        .prepare("SELECT * FROM disputes ORDER BY datetime(created_at) DESC")
        .all() as Record<string, unknown>[]);

  return rows.map(mapDisputeRow);
}

export function openDispute(input: {
  paymentTxHash: string;
  openedByWallet: string;
  reason: string;
  details: string;
}) {
  const db = getDatabase();
  const attestation = db
    .prepare("SELECT id, buyer_wallet, agent_wallet FROM attestations WHERE payment_tx_hash = ?")
    .get(input.paymentTxHash) as
    | { id: string; buyer_wallet: string; agent_wallet: string }
    | undefined;

  if (!attestation) {
    throw new Error("Attestation not found for the provided payment hash.");
  }

  const openedByWallet = normalizeWallet(input.openedByWallet);
  if (
    openedByWallet !== normalizeWallet(attestation.buyer_wallet) &&
    openedByWallet !== normalizeWallet(attestation.agent_wallet)
  ) {
    throw new Error("Only the buyer or the agent can open a dispute.");
  }

  const dispute: Dispute = {
    id: `dispute_${Date.now()}`,
    paymentTxHash: input.paymentTxHash.trim(),
    attestationId: attestation.id,
    openedByWallet,
    reason: input.reason.trim(),
    details: input.details.trim(),
    status: "open",
    createdAt: new Date().toISOString(),
  };

  db.prepare(
    `
      INSERT INTO disputes (
        id,
        payment_tx_hash,
        attestation_id,
        opened_by_wallet,
        reason,
        details,
        status,
        created_at
      ) VALUES (
        @id,
        @payment_tx_hash,
        @attestation_id,
        @opened_by_wallet,
        @reason,
        @details,
        @status,
        @created_at
      )
    `,
  ).run({
    id: dispute.id,
    payment_tx_hash: dispute.paymentTxHash,
    attestation_id: dispute.attestationId,
    opened_by_wallet: dispute.openedByWallet,
    reason: dispute.reason,
    details: dispute.details,
    status: dispute.status,
    created_at: dispute.createdAt,
  });

  return dispute;
}

export function updateDisputeStatus(input: {
  id: string;
  status: Dispute["status"];
}) {
  const db = getDatabase();
  const status = input.status.trim() as Dispute["status"];

  if (!["open", "reviewed", "resolved"].includes(status)) {
    throw new Error("Unsupported dispute status.");
  }

  const existing = db
    .prepare("SELECT * FROM disputes WHERE id = ?")
    .get(input.id.trim()) as Record<string, unknown> | undefined;

  if (!existing) {
    throw new Error("Dispute not found.");
  }

  db.prepare("UPDATE disputes SET status = ? WHERE id = ?").run(
    status,
    input.id.trim(),
  );

  return mapDisputeRow({
    ...existing,
    status,
  });
}
