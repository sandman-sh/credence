export const taskCategories = [
  "research",
  "coding",
  "translation",
  "analysis",
] as const;

export type TaskCategory = (typeof taskCategories)[number];

export type Agent = {
  id: string;
  name: string;
  handle: string;
  wallet: string;
  headline: string;
  description: string;
  specialties: TaskCategory[];
  baseRateUsd: number;
  location: string;
  responseTime: string;
  accent: string;
};

export type Attestation = {
  id: string;
  agentId: string;
  agentWallet: string;
  buyerWallet: string;
  reviewNonce?: string;
  paymentTxHash: string;
  taskCategory: TaskCategory;
  amountPaid: number;
  success: boolean;
  reviewRating: number;
  timestamp: string;
  comment: string;
  taskSummary: string;
  verifiedLedger?: number;
  verifiedAt?: string;
  horizonUrl?: string;
  contractId?: string;
  contractTxHash?: string;
  contractLedger?: number;
  reviewDepositTxHash?: string;
  signerWallet?: string;
  reviewSignature?: string;
  integrityScore?: number;
  integrityNotes?: string[];
};

export type PaymentVerification = {
  network: "Stellar testnet";
  sourceAccount: string;
  destinationAccount: string;
  transferredAmount: string;
  transferredAsset: string;
  memoType?: string;
  memoValue?: string;
  ledger: number;
  createdAt: string;
  operationCount: number;
  successful: boolean;
  horizonUrl: string;
};

export type PaidTaskJob = {
  id: string;
  agentId: string;
  agentWallet: string;
  buyerWallet: string;
  reviewNonce: string;
  paymentTxHash: string;
  taskCategory: TaskCategory;
  amountPaid: number;
  prompt: string;
  createdAt: string;
  status: "completed";
  result: string;
  minimumReviewAmount: number;
  reviewDepositUsd: number;
  reviewDepositWallet?: string;
  integrityStatus: "verified" | "flagged";
  verification: PaymentVerification;
};

export type CategoryScores = Record<TaskCategory, number>;

export type SupportedPaymentAsset = {
  code: "XLM" | "USDC";
  issuer?: string;
  network: "stellar:testnet";
  amount: string;
  decimals: number;
};

export type PaymentSplit = {
  recipient: string;
  role: "agent" | "platform" | "reserve";
  shareBps: number;
  amount: string;
  asset: string;
};

export type AgentServiceOffer = {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  priceUsd: number;
  estimatedDuration: string;
  acceptedAssets: SupportedPaymentAsset[];
  x402Endpoint: string;
  outputSchema: string;
};

export type AgentSnapshot = Agent & {
  scores: CategoryScores;
  overallScore: number;
  trustLabel: string;
  paidCompletions: number;
  earningsUsd: number;
  averageRating: number;
  successRate: number;
  recentAttestations: Attestation[];
};

export type MarketplaceSnapshot = {
  network: "Stellar testnet";
  trustMode: "receipt-verified" | "contract-backed";
  agents: AgentSnapshot[];
  recentAttestations: Attestation[];
  featuredPair: [AgentSnapshot, AgentSnapshot];
  totals: {
    paidCompletions: number;
    earningsUsd: number;
    attestations: number;
  };
};

export type MarketplaceAgentListing = {
  id: string;
  name: string;
  handle: string;
  wallet: string;
  headline: string;
  description: string;
  specialties: TaskCategory[];
  overallScore: number;
  trustLabel: string;
  averageRating: number;
  paidCompletions: number;
  earningsUsd: number;
  baseRateUsd: number;
  responseTime: string;
  categoryScores: CategoryScores;
  x402: {
    endpoint: string;
    network: "stellar:testnet";
    acceptedAssets: SupportedPaymentAsset[];
    services: AgentServiceOffer[];
  };
};

export type MarketplaceApiResponse = {
  network: "stellar:testnet";
  generatedAt: string;
  totalAgents: number;
  contractId?: string;
  agents: MarketplaceAgentListing[];
};

export type PaidTaskRequest = {
  agentId: string;
  buyerWallet: string;
  paymentTxHash: string;
  taskCategory: TaskCategory;
  amountPaid: number;
  prompt: string;
  expectedMemo?: string;
  allowedAssets?: string[];
  verificationOverride?: PaymentVerification;
};

export type HireAgentRequest = {
  buyerWallet: string;
  taskCategory: TaskCategory;
  prompt: string;
  maxAmountUsd?: number;
  preferredAsset?: "XLM" | "USDC";
  signedAttestationXdr?: string;
  reviewRating?: number;
  success?: boolean;
  comment?: string;
};

export type AutonomousAttestationDraft = {
  status: "buyer_signature_required" | "completed";
  reviewNonce: string;
  success: boolean;
  reviewRating: number;
  comment: string;
  contractId?: string;
  preparedEnvelope?: PreparedAttestationEnvelope;
  contractTxHash?: string;
  contractLedger?: number;
};

export type HireAgentResult = {
  stage: "payment_required" | "payment_verified" | "completed";
  agentId: string;
  buyerWallet: string;
  paymentTxHash: string;
  taskCategory: TaskCategory;
  amountPaid: number;
  paymentAsset: string;
  result?: string;
  verification?: PaymentVerification;
  paymentSplits?: PaymentSplit[];
  attestation?: AutonomousAttestationDraft;
  marketplace?: MarketplaceSnapshot;
  agent?: AgentSnapshot | null;
  reputationDelta?: {
    buyerWeight: number;
    category: TaskCategory;
    amountWeight: number;
    projectedScore: number;
  };
};

export type ReviewRequest = {
  agentId: string;
  buyerWallet: string;
  reviewNonce: string;
  paymentTxHash: string;
  taskCategory: TaskCategory;
  success: boolean;
  reviewRating: number;
  comment: string;
  reviewDepositTxHash?: string;
  signerWallet?: string;
  reviewSignature?: string;
  signedTransactionXdr?: string;
  contractId?: string;
  contractTxHash?: string;
  contractLedger?: number;
};

export type PreparedAttestationRequest = {
  agentId: string;
  buyerWallet: string;
  reviewNonce: string;
  paymentTxHash: string;
  taskCategory: TaskCategory;
  success: boolean;
  reviewRating: number;
  comment: string;
};

export type PreparedAttestationEnvelope = {
  contractId: string;
  networkPassphrase: string;
  transactionXdr: string;
  reviewNonce: string;
  expiresAt: string;
};

export type VerifierSummary = {
  agentWallet: string;
  agentId: string;
  overallScore: number;
  trustLabel: string;
  categories: CategoryScores;
  paidCompletions: number;
  earningsUsd: number;
  averageRating: number;
  successRate: number;
  recentReviews: Attestation[];
  onchain?: OnchainSyncSummary;
};

export type TestnetNetworkSummary = {
  networkPassphrase: string;
  horizonUrl: string;
  friendbotUrl: string;
  latestLedger: number;
  closedAt: string;
  protocolVersion: number;
  horizonVersion: string;
};

export type TestnetAccountSummary = {
  address: string;
  exists: boolean;
  sequence?: string;
  nativeBalance?: string;
  subentryCount?: number;
  homeDomain?: string;
};

export type Dispute = {
  id: string;
  paymentTxHash: string;
  attestationId: string;
  openedByWallet: string;
  reason: string;
  details: string;
  status: "open" | "reviewed" | "resolved";
  createdAt: string;
};

export type OnchainAttestation = {
  id: number;
  agent: string;
  buyer: string;
  paymentTxHash: string;
  taskCategory: string;
  amountPaidMicrousd: string;
  success: boolean;
  reviewRating: number;
  timestamp: number;
  comment: string;
  taskSummary: string;
  verifiedLedger: number;
  horizonUrl: string;
};

export type OnchainSyncSummary = {
  contractId: string;
  source: "soroban-testnet";
  syncedAt: string;
  onchainAttestationCount: number;
  indexedAttestationCount: number;
  latestContractLedger?: number;
  latestContractTxHash?: string;
  syncedAttestations: OnchainAttestation[];
};
