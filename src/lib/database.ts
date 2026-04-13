import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import { Agent, Attestation, Dispute, PaidTaskJob } from "@/lib/types";

type LegacyStore = {
  agents: Agent[];
  attestations: Attestation[];
  jobs: PaidTaskJob[];
};

import { tmpdir } from "node:os";

const isVercel = !!process.env.VERCEL;
const DATA_DIRECTORY = isVercel ? tmpdir() : join(process.cwd(), ".data");
const DATABASE_PATH = join(DATA_DIRECTORY, "credence.db");
const LEGACY_STORE_PATH = join(DATA_DIRECTORY, "credence-store.json");

let database: Database.Database | null = null;

function ensureDataDirectory() {
  const directory = dirname(DATABASE_PATH);
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }

  // If Vercel and fresh DB, try to copy a bundled db if we shipped one
  if (isVercel && !existsSync(DATABASE_PATH)) {
    const bundledDbPath = join(process.cwd(), ".data", "credence.db");
    if (existsSync(bundledDbPath)) {
      try {
        import("node:fs").then((fs) => fs.copyFileSync(bundledDbPath, DATABASE_PATH));
      } catch (e) {
        // Ignore copy errors
      }
    }
  }
}

function createDatabase() {
  ensureDataDirectory();

  const db = new Database(DATABASE_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      handle TEXT NOT NULL,
      wallet TEXT NOT NULL UNIQUE,
      headline TEXT NOT NULL,
      description TEXT NOT NULL,
      specialties_json TEXT NOT NULL,
      base_rate_usd REAL NOT NULL,
      location TEXT NOT NULL,
      response_time TEXT NOT NULL,
      accent TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      agent_wallet TEXT NOT NULL,
      buyer_wallet TEXT NOT NULL,
      review_nonce TEXT NOT NULL UNIQUE,
      payment_tx_hash TEXT NOT NULL UNIQUE,
      task_category TEXT NOT NULL,
      amount_paid REAL NOT NULL,
      prompt TEXT NOT NULL,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL,
      result TEXT NOT NULL,
      minimum_review_amount REAL NOT NULL DEFAULT 0,
      review_deposit_usd REAL NOT NULL DEFAULT 0,
      review_deposit_wallet TEXT,
      integrity_status TEXT NOT NULL DEFAULT 'verified',
      verification_network TEXT NOT NULL,
      verification_source_account TEXT NOT NULL,
      verification_destination_account TEXT,
      verification_transferred_amount TEXT,
      verification_transferred_asset TEXT,
      verification_ledger INTEGER NOT NULL,
      verification_created_at TEXT NOT NULL,
      verification_operation_count INTEGER NOT NULL,
      verification_successful INTEGER NOT NULL,
      verification_horizon_url TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attestations (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      agent_wallet TEXT NOT NULL,
      buyer_wallet TEXT NOT NULL,
      review_nonce TEXT,
      payment_tx_hash TEXT NOT NULL UNIQUE,
      task_category TEXT NOT NULL,
      amount_paid REAL NOT NULL,
      success INTEGER NOT NULL,
      review_rating INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      comment TEXT NOT NULL,
      task_summary TEXT NOT NULL,
      verified_ledger INTEGER,
      verified_at TEXT,
      horizon_url TEXT,
      contract_id TEXT,
      contract_tx_hash TEXT,
      contract_ledger INTEGER,
      review_deposit_tx_hash TEXT,
      signer_wallet TEXT,
      review_signature TEXT,
      integrity_score INTEGER DEFAULT 100,
      integrity_notes_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_agent_id ON jobs(agent_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_buyer_wallet ON jobs(buyer_wallet);
    CREATE INDEX IF NOT EXISTS idx_attestations_agent_id ON attestations(agent_id);
    CREATE INDEX IF NOT EXISTS idx_attestations_buyer_wallet ON attestations(buyer_wallet);
    CREATE INDEX IF NOT EXISTS idx_attestations_created_at ON attestations(timestamp DESC);

    CREATE TABLE IF NOT EXISTS disputes (
      id TEXT PRIMARY KEY,
      payment_tx_hash TEXT NOT NULL,
      attestation_id TEXT NOT NULL,
      opened_by_wallet TEXT NOT NULL,
      reason TEXT NOT NULL,
      details TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL
    );
  `);

  return db;
}

function ensureColumn(
  db: Database.Database,
  tableName: string,
  columnName: string,
  definition: string,
) {
  const columns = db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as Array<{ name: string }>;

  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function readLegacyStore() {
  if (!existsSync(LEGACY_STORE_PATH)) {
    return null;
  }

  return JSON.parse(readFileSync(LEGACY_STORE_PATH, "utf8")) as LegacyStore;
}

function hasAnyRows(db: Database.Database) {
  const row = db
    .prepare(
      `
        SELECT
          (SELECT COUNT(*) FROM agents) AS agent_count,
          (SELECT COUNT(*) FROM jobs) AS job_count,
          (SELECT COUNT(*) FROM attestations) AS attestation_count
      `,
    )
    .get() as {
    agent_count: number;
    job_count: number;
    attestation_count: number;
  };

  return row.agent_count + row.job_count + row.attestation_count > 0;
}

function importLegacyStore(db: Database.Database, legacyStore: LegacyStore) {
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

  const insertJob = db.prepare(`
    INSERT OR REPLACE INTO jobs (
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
      verification_destination_account,
      verification_transferred_amount,
      verification_transferred_asset,
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
      @verification_destination_account,
      @verification_transferred_amount,
      @verification_transferred_asset,
      @verification_ledger,
      @verification_created_at,
      @verification_operation_count,
      @verification_successful,
      @verification_horizon_url
    )
  `);

  const insertAttestation = db.prepare(`
    INSERT OR REPLACE INTO attestations (
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
  `);

  const migrate = db.transaction(() => {
    for (const agent of legacyStore.agents) {
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

    for (const job of legacyStore.jobs) {
      insertJob.run({
        id: job.id,
        agent_id: job.agentId,
        agent_wallet: job.agentWallet,
        buyer_wallet: job.buyerWallet,
        review_nonce: job.reviewNonce ?? `legacy-${job.paymentTxHash}`,
        payment_tx_hash: job.paymentTxHash,
        task_category: job.taskCategory,
        amount_paid: job.amountPaid,
        prompt: job.prompt,
        created_at: job.createdAt,
        status: job.status,
        result: job.result,
        minimum_review_amount: job.minimumReviewAmount ?? 0,
        review_deposit_usd: job.reviewDepositUsd ?? 0,
        review_deposit_wallet: job.reviewDepositWallet ?? null,
        integrity_status: job.integrityStatus ?? "verified",
        verification_network: job.verification.network,
        verification_source_account: job.verification.sourceAccount,
        verification_destination_account:
          job.verification.destinationAccount ?? null,
        verification_transferred_amount:
          job.verification.transferredAmount ?? null,
        verification_transferred_asset:
          job.verification.transferredAsset ?? null,
        verification_ledger: job.verification.ledger,
        verification_created_at: job.verification.createdAt,
        verification_operation_count: job.verification.operationCount,
        verification_successful: job.verification.successful ? 1 : 0,
        verification_horizon_url: job.verification.horizonUrl,
      });
    }

    for (const attestation of legacyStore.attestations) {
      insertAttestation.run({
        id: attestation.id,
        agent_id: attestation.agentId,
        agent_wallet: attestation.agentWallet,
        buyer_wallet: attestation.buyerWallet,
        review_nonce: attestation.reviewNonce ?? `legacy-${attestation.paymentTxHash}`,
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
        review_deposit_tx_hash:
          attestation.reviewDepositTxHash === undefined
            ? null
            : attestation.reviewDepositTxHash,
        signer_wallet: attestation.signerWallet ?? null,
        review_signature: attestation.reviewSignature ?? null,
        integrity_score: attestation.integrityScore ?? 100,
        integrity_notes_json: JSON.stringify(attestation.integrityNotes ?? []),
      });
    }
  });

  migrate();
}

export function getDatabase() {
  if (!database) {
    database = createDatabase();
    ensureColumn(
      database,
      "jobs",
      "verification_destination_account",
      "TEXT",
    );
    ensureColumn(database, "jobs", "review_deposit_usd", "REAL NOT NULL DEFAULT 0");
    ensureColumn(database, "jobs", "review_deposit_wallet", "TEXT");
    ensureColumn(database, "jobs", "verification_transferred_amount", "TEXT");
    ensureColumn(database, "jobs", "verification_transferred_asset", "TEXT");
    ensureColumn(database, "attestations", "review_deposit_tx_hash", "TEXT");

    if (!hasAnyRows(database)) {
      const legacyStore = readLegacyStore();
      if (legacyStore) {
        importLegacyStore(database, legacyStore);
      }
    }
  }

  return database;
}

export function mapAgentRow(row: Record<string, unknown>): Agent {
  return {
    id: String(row.id),
    name: String(row.name),
    handle: String(row.handle),
    wallet: String(row.wallet),
    headline: String(row.headline),
    description: String(row.description),
    specialties: JSON.parse(String(row.specialties_json)),
    baseRateUsd: Number(row.base_rate_usd),
    location: String(row.location),
    responseTime: String(row.response_time),
    accent: String(row.accent),
  };
}

export function mapAttestationRow(row: Record<string, unknown>): Attestation {
  return {
    id: String(row.id),
    agentId: String(row.agent_id),
    agentWallet: String(row.agent_wallet),
    buyerWallet: String(row.buyer_wallet),
    reviewNonce:
      row.review_nonce === null || row.review_nonce === undefined
        ? undefined
        : String(row.review_nonce),
    paymentTxHash: String(row.payment_tx_hash),
    taskCategory: String(row.task_category) as Attestation["taskCategory"],
    amountPaid: Number(row.amount_paid),
    success: Number(row.success) === 1,
    reviewRating: Number(row.review_rating),
    timestamp: String(row.timestamp),
    comment: String(row.comment),
    taskSummary: String(row.task_summary),
    verifiedLedger:
      row.verified_ledger === null || row.verified_ledger === undefined
        ? undefined
        : Number(row.verified_ledger),
    verifiedAt:
      row.verified_at === null || row.verified_at === undefined
        ? undefined
        : String(row.verified_at),
    horizonUrl:
      row.horizon_url === null || row.horizon_url === undefined
        ? undefined
        : String(row.horizon_url),
    contractId:
      row.contract_id === null || row.contract_id === undefined
        ? undefined
        : String(row.contract_id),
    contractTxHash:
      row.contract_tx_hash === null || row.contract_tx_hash === undefined
        ? undefined
        : String(row.contract_tx_hash),
    contractLedger:
      row.contract_ledger === null || row.contract_ledger === undefined
        ? undefined
        : Number(row.contract_ledger),
    reviewDepositTxHash:
      row.review_deposit_tx_hash === null ||
      row.review_deposit_tx_hash === undefined
        ? undefined
        : String(row.review_deposit_tx_hash),
    signerWallet:
      row.signer_wallet === null || row.signer_wallet === undefined
        ? undefined
        : String(row.signer_wallet),
    reviewSignature:
      row.review_signature === null || row.review_signature === undefined
        ? undefined
        : String(row.review_signature),
    integrityScore:
      row.integrity_score === null || row.integrity_score === undefined
        ? undefined
        : Number(row.integrity_score),
    integrityNotes: JSON.parse(String(row.integrity_notes_json ?? "[]")),
  };
}

export function mapJobRow(row: Record<string, unknown>): PaidTaskJob {
  return {
    id: String(row.id),
    agentId: String(row.agent_id),
    agentWallet: String(row.agent_wallet),
    buyerWallet: String(row.buyer_wallet),
    reviewNonce: String(row.review_nonce),
    paymentTxHash: String(row.payment_tx_hash),
    taskCategory: String(row.task_category) as PaidTaskJob["taskCategory"],
    amountPaid: Number(row.amount_paid),
    prompt: String(row.prompt),
    createdAt: String(row.created_at),
    status: "completed",
    result: String(row.result),
    minimumReviewAmount: Number(row.minimum_review_amount ?? 0),
    reviewDepositUsd: Number(row.review_deposit_usd ?? 0),
    reviewDepositWallet:
      row.review_deposit_wallet === null || row.review_deposit_wallet === undefined
        ? undefined
        : String(row.review_deposit_wallet),
    integrityStatus:
      String(row.integrity_status) === "flagged" ? "flagged" : "verified",
    verification: {
      network: "Stellar testnet",
      sourceAccount: String(row.verification_source_account),
      destinationAccount: String(row.verification_destination_account ?? ""),
      transferredAmount: String(row.verification_transferred_amount ?? "0"),
      transferredAsset: String(row.verification_transferred_asset ?? "XLM"),
      ledger: Number(row.verification_ledger),
      createdAt: String(row.verification_created_at),
      operationCount: Number(row.verification_operation_count),
      successful: Number(row.verification_successful) === 1,
      horizonUrl: String(row.verification_horizon_url),
    },
  };
}

export function mapDisputeRow(row: Record<string, unknown>): Dispute {
  return {
    id: String(row.id),
    paymentTxHash: String(row.payment_tx_hash),
    attestationId: String(row.attestation_id),
    openedByWallet: String(row.opened_by_wallet),
    reason: String(row.reason),
    details: String(row.details),
    status: String(row.status) as Dispute["status"],
    createdAt: String(row.created_at),
  };
}

export { DATABASE_PATH };
