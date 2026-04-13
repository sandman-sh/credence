import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  BASE_FEE,
  Contract,
  Networks,
  TransactionBuilder,
  Address,
  contract,
  rpc,
} from "@stellar/stellar-sdk";
import {
  OnchainAttestation,
  PreparedAttestationEnvelope,
  PreparedAttestationRequest,
} from "@/lib/types";
import { STELLAR_TESTNET } from "@/lib/stellar";

const WASM_PATH = join(
  process.cwd(),
  "contracts",
  "target",
  "wasm32v1-none",
  "release",
  "credence_attestations.wasm",
);

let contractSpec: contract.Spec | null = null;
let rpcServer: rpc.Server | null = null;

function getRpcServer() {
  if (!rpcServer) {
    rpcServer = new rpc.Server(STELLAR_TESTNET.rpcUrl);
  }

  return rpcServer;
}

function getContractSpec() {
  if (!contractSpec) {
    contractSpec = contract.Spec.fromWasm(readFileSync(WASM_PATH));
  }

  return contractSpec;
}

export function getCredenceContractId() {
  return (
    process.env.CREDENCE_ATTESTATION_CONTRACT_ID ??
    process.env.NEXT_PUBLIC_CREDENCE_ATTESTATION_CONTRACT_ID ??
    ""
  ).trim();
}

export function hasCredenceContract() {
  return Boolean(getCredenceContractId());
}

function getNetworkPassphrase() {
  return process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE?.trim() || Networks.TESTNET;
}

function getContractReadSource() {
  return (
    process.env.CREDENCE_CONTRACT_READ_SOURCE?.trim().toUpperCase() ||
    process.env.CREDENCE_REVIEW_DEPOSIT_WALLET?.trim().toUpperCase() ||
    "GDOZKUS77S5AHKGN5NUQEYQJXIROQGJNRL4RTGGP2DCXVRO3K3NOBPKP"
  );
}

async function simulateContractMethod(name: string, args: object) {
  const contractId = getCredenceContractId();
  if (!contractId) {
    throw new Error("Credence attestation contract is not configured.");
  }

  const server = getRpcServer();
  const account = await server.getAccount(getContractReadSource());
  const contractClient = new Contract(contractId);
  const spec = getContractSpec();
  const operationArgs = spec.funcArgsToScVals(name, args);

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(contractClient.call(name, ...operationArgs))
    .setTimeout(60)
    .build();

  const simulation = await server.simulateTransaction(transaction);
  if (!rpc.Api.isSimulationSuccess(simulation) || !simulation.result) {
    throw new Error("Unable to simulate the Soroban contract read.");
  }

  return spec.funcResToNative(name, simulation.result.retval);
}

export async function prepareAttestationTransaction(
  input: PreparedAttestationRequest & {
    agentWallet: string;
    amountPaid: number;
    taskSummary: string;
    verifiedLedger: number;
    horizonUrl: string;
  },
): Promise<PreparedAttestationEnvelope> {
  const contractId = getCredenceContractId();
  if (!contractId) {
    throw new Error("Credence attestation contract is not configured.");
  }

  const server = getRpcServer();
  const account = await server.getAccount(input.buyerWallet);
  const contractClient = new Contract(contractId);
  const spec = getContractSpec();

  const operationArgs = spec.funcArgsToScVals("submit_attestation", {
    buyer: input.buyerWallet,
    agent: input.agentWallet,
    payment_tx_hash: input.paymentTxHash,
    task_category: input.taskCategory,
    amount_paid_microusd: BigInt(Math.round(input.amountPaid * 1_000_000)),
    success: input.success,
    review_rating: input.reviewRating,
    timestamp: Math.floor(Date.now() / 1000),
    comment: input.comment,
    task_summary: input.taskSummary,
    verified_ledger: input.verifiedLedger,
    horizon_url: input.horizonUrl,
  });

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(contractClient.call("submit_attestation", ...operationArgs))
    .setTimeout(300)
    .build();

  const prepared = await server.prepareTransaction(transaction);

  return {
    contractId,
    networkPassphrase: getNetworkPassphrase(),
    transactionXdr: prepared.toXDR(),
    reviewNonce: input.reviewNonce,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  };
}

export function parseSignedTransaction(signedTransactionXdr: string) {
  return TransactionBuilder.fromXDR(
    signedTransactionXdr,
    getNetworkPassphrase(),
  );
}

export async function submitSignedAttestationTransaction(signedTransactionXdr: string) {
  const server = getRpcServer();
  const sendResponse = await server.sendTransaction(
    parseSignedTransaction(signedTransactionXdr),
  );

  if (sendResponse.status === "ERROR") {
    throw new Error("Soroban transaction submission failed.");
  }

  const finalResponse = await server.pollTransaction(sendResponse.hash, {
    attempts: 12,
  });

  if (finalResponse.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error("Soroban transaction did not complete successfully.");
  }

  return {
    contractId: getCredenceContractId(),
    hash: finalResponse.txHash,
    ledger: finalResponse.ledger,
    createdAt: new Date(finalResponse.createdAt * 1000).toISOString(),
    signatureDigest: createHash("sha256")
      .update(signedTransactionXdr)
      .digest("hex"),
  };
}

function normalizeContractAttestation(record: Record<string, unknown>): OnchainAttestation {
  const agent =
    typeof record.agent === "string"
      ? record.agent
      : String((record.agent as Address).toString?.() ?? "");
  const buyer =
    typeof record.buyer === "string"
      ? record.buyer
      : String((record.buyer as Address).toString?.() ?? "");

  return {
    id: Number(record.id),
    agent,
    buyer,
    paymentTxHash: String(record.payment_tx_hash),
    taskCategory: String(record.task_category),
    amountPaidMicrousd: String(record.amount_paid_microusd),
    success: Boolean(record.success),
    reviewRating: Number(record.review_rating),
    timestamp: Number(record.timestamp),
    comment: String(record.comment),
    taskSummary: String(record.task_summary),
    verifiedLedger: Number(record.verified_ledger),
    horizonUrl: String(record.horizon_url),
  };
}

export async function listOnchainAttestationsForAgent(agentWallet: string) {
  const nativeResult = (await simulateContractMethod("list_agent_attestations", {
    agent: agentWallet,
  })) as Array<Record<string, unknown>>;

  return nativeResult.map(normalizeContractAttestation);
}
