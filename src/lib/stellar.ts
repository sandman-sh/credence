import { StrKey } from "@stellar/stellar-sdk";
import {
  PaymentSplit,
  PaymentVerification,
  TestnetAccountSummary,
  TestnetNetworkSummary,
} from "@/lib/types";

export const STELLAR_TESTNET = {
  network: "Stellar testnet" as const,
  horizonUrl: "https://horizon-testnet.stellar.org",
  friendbotUrl: "https://friendbot.stellar.org",
  rpcUrl: "https://soroban-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
};

type HorizonTransactionRecord = {
  hash: string;
  successful: boolean;
  source_account: string;
  memo_type?: string;
  memo?: string;
  ledger: number;
  created_at: string;
  operation_count: number;
};

type HorizonAccountRecord = {
  account_id: string;
  sequence: string;
  subentry_count: number;
  home_domain?: string;
  balances: Array<{
    asset_type: string;
    balance: string;
  }>;
};

type HorizonOperationRecord = {
  type: string;
  to?: string;
  account?: string;
  amount?: string;
  starting_balance?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
};

type HorizonOperationsPage = {
  _embedded?: {
    records?: HorizonOperationRecord[];
  };
};

export function isValidStellarAddress(address: string) {
  return StrKey.isValidEd25519PublicKey(address.trim());
}

export async function getTestnetNetworkSummary(): Promise<TestnetNetworkSummary> {
  const response = await fetch(STELLAR_TESTNET.horizonUrl, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to reach Stellar testnet.");
  }

  const data = await response.json();

  return {
    networkPassphrase: data.network_passphrase ?? STELLAR_TESTNET.networkPassphrase,
    horizonUrl: STELLAR_TESTNET.horizonUrl,
    friendbotUrl: STELLAR_TESTNET.friendbotUrl,
    latestLedger: Number(data.history_latest_ledger ?? 0),
    closedAt: data.history_latest_ledger_closed_at ?? new Date().toISOString(),
    protocolVersion: Number(data.current_protocol_version ?? 0),
    horizonVersion: String(data.horizon_version ?? "unknown"),
  };
}

export async function getTestnetAccountSummary(
  address: string,
): Promise<TestnetAccountSummary> {
  const normalized = address.trim().toUpperCase();
  if (!isValidStellarAddress(normalized)) {
    throw new Error("Enter a valid Stellar public key.");
  }

  const response = await fetch(
    `${STELLAR_TESTNET.horizonUrl}/accounts/${normalized}`,
    {
      cache: "no-store",
    },
  );

  if (response.status === 404) {
    return {
      address: normalized,
      exists: false,
    };
  }

  if (!response.ok) {
    throw new Error("Unable to read the Stellar testnet account.");
  }

  const data = (await response.json()) as HorizonAccountRecord;
  const nativeBalance =
    data.balances.find((balance) => balance.asset_type === "native")?.balance ??
    "0";

  return {
    address: normalized,
    exists: true,
    sequence: data.sequence,
    nativeBalance,
    subentryCount: data.subentry_count,
    homeDomain: data.home_domain,
  };
}

export async function fundTestnetAccount(address: string) {
  const normalized = address.trim().toUpperCase();
  if (!isValidStellarAddress(normalized)) {
    throw new Error("Enter a valid Stellar public key.");
  }

  const response = await fetch(
    `${STELLAR_TESTNET.friendbotUrl}?addr=${encodeURIComponent(normalized)}`,
    {
      cache: "no-store",
    },
  );

  const data = await response.json();

  if (!response.ok) {
    const detail =
      typeof data?.detail === "string"
        ? data.detail
        : "Unable to fund the testnet account.";
    throw new Error(detail);
  }

  return {
    address: normalized,
    hash: String(data.hash ?? ""),
    successful: true,
  };
}

async function getTransactionRecord(hash: string) {
  const normalized = hash.trim();
  const response = await fetch(
    `${STELLAR_TESTNET.horizonUrl}/transactions/${normalized}`,
    {
      cache: "no-store",
    },
  );

  if (response.status === 404) {
    throw new Error("Transaction hash was not found on Stellar testnet.");
  }

  if (!response.ok) {
    throw new Error("Unable to verify the Stellar testnet transaction.");
  }

  return (await response.json()) as HorizonTransactionRecord;
}

async function getTransactionOperations(hash: string) {
  const normalized = hash.trim();
  const response = await fetch(
    `${STELLAR_TESTNET.horizonUrl}/transactions/${normalized}/operations?limit=200&order=asc`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Unable to inspect transaction operations on Stellar testnet.");
  }

  const data = (await response.json()) as HorizonOperationsPage;
  return data._embedded?.records ?? [];
}

function getOperationRecipient(operation: HorizonOperationRecord) {
  if (operation.type === "payment") {
    return {
      destination: operation.to,
      amount: operation.amount,
      asset:
        operation.asset_type === "native"
          ? "XLM"
          : `${operation.asset_code ?? "asset"}:${operation.asset_issuer ?? ""}`,
    };
  }

  if (operation.type === "create_account") {
    return {
      destination: operation.account,
      amount: operation.starting_balance,
      asset: "XLM",
    };
  }

  return null;
}

export async function verifyTestnetPaymentProof(params: {
  buyerWallet: string;
  paymentTxHash: string;
  recipientWallet: string;
  expectedMemo?: string;
  allowedAssets?: string[];
}): Promise<PaymentVerification> {
  const buyerWallet = params.buyerWallet.trim().toUpperCase();
  const recipientWallet = params.recipientWallet.trim().toUpperCase();
  if (!isValidStellarAddress(buyerWallet)) {
    throw new Error("Buyer wallet must be a valid Stellar public key.");
  }
  if (!isValidStellarAddress(recipientWallet)) {
    throw new Error("Recipient wallet must be a valid Stellar public key.");
  }

  const account = await getTestnetAccountSummary(buyerWallet);
  if (!account.exists) {
    throw new Error("Buyer wallet does not exist on Stellar testnet yet.");
  }

  const transaction = await getTransactionRecord(params.paymentTxHash);

  if (!transaction.successful) {
    throw new Error("Transaction exists but is not successful.");
  }

  if (transaction.source_account !== buyerWallet) {
    throw new Error("Transaction source account does not match the buyer wallet.");
  }

  if (params.expectedMemo) {
    const memoValue = transaction.memo ?? "";
    if (memoValue !== params.expectedMemo) {
      throw new Error("Transaction memo does not match the quoted x402 payment request.");
    }
  }

  const operations = await getTransactionOperations(params.paymentTxHash);
  const matchingPayment = operations
    .map(getOperationRecipient)
    .find(
      (operation) =>
        operation &&
        operation.destination?.toUpperCase() === recipientWallet &&
        (!params.allowedAssets?.length ||
          params.allowedAssets.includes(String(operation.asset))),
    );

  if (!matchingPayment) {
    throw new Error(
      "Transaction does not contain a payment operation to the selected agent wallet.",
    );
  }

  return {
    network: STELLAR_TESTNET.network,
    sourceAccount: transaction.source_account,
    destinationAccount: recipientWallet,
    transferredAmount: matchingPayment.amount ?? "0",
    transferredAsset: matchingPayment.asset,
    memoType: transaction.memo_type,
    memoValue: transaction.memo,
    ledger: transaction.ledger,
    createdAt: transaction.created_at,
    operationCount: transaction.operation_count,
    successful: transaction.successful,
    horizonUrl: `${STELLAR_TESTNET.horizonUrl}/transactions/${transaction.hash}`,
  };
}

export async function verifyTestnetSplitPaymentProof(params: {
  buyerWallet: string;
  paymentTxHash: string;
  splits: PaymentSplit[];
  expectedMemo?: string;
}): Promise<PaymentVerification> {
  const buyerWallet = params.buyerWallet.trim().toUpperCase();
  if (!isValidStellarAddress(buyerWallet)) {
    throw new Error("Buyer wallet must be a valid Stellar public key.");
  }

  const account = await getTestnetAccountSummary(buyerWallet);
  if (!account.exists) {
    throw new Error("Buyer wallet does not exist on Stellar testnet yet.");
  }

  const transaction = await getTransactionRecord(params.paymentTxHash);

  if (!transaction.successful) {
    throw new Error("Transaction exists but is not successful.");
  }

  if (transaction.source_account !== buyerWallet) {
    throw new Error("Transaction source account does not match the buyer wallet.");
  }

  if (params.expectedMemo) {
    const memoValue = transaction.memo ?? "";
    if (memoValue !== params.expectedMemo) {
      throw new Error("Transaction memo does not match the quoted x402 payment request.");
    }
  }

  const operations = await getTransactionOperations(params.paymentTxHash);
  const normalized = operations
    .map(getOperationRecipient)
    .filter((operation): operation is NonNullable<ReturnType<typeof getOperationRecipient>> => Boolean(operation));

  for (const split of params.splits) {
    const targetDestination = split.recipient.trim().toUpperCase();
    const matching = normalized.filter(
      (operation) =>
        operation.destination?.toUpperCase() === targetDestination &&
        String(operation.asset) === split.asset,
    );

    if (matching.length === 0) {
      throw new Error(
        `Transaction does not contain the required ${split.role} payment for ${targetDestination}.`,
      );
    }

    const totalMatched = Number(
      matching
        .reduce((sum, operation) => sum + Number(operation.amount ?? "0"), 0)
        .toFixed(7),
    );
    const expectedAmount = Number(Number(split.amount).toFixed(7));
    if (Math.abs(totalMatched - expectedAmount) > 0.0000002) {
      throw new Error(
        `Transaction split for ${split.role} is ${totalMatched}, expected ${expectedAmount}.`,
      );
    }
  }

  const agentSplit = params.splits.find((split) => split.role === "agent") ?? params.splits[0];
  const totalAmount = Number(
    params.splits
      .reduce((sum, split) => sum + Number(split.amount), 0)
      .toFixed(7),
  );

  return {
    network: STELLAR_TESTNET.network,
    sourceAccount: transaction.source_account,
    destinationAccount: agentSplit.recipient,
    transferredAmount: totalAmount.toFixed(7),
    transferredAsset: agentSplit.asset,
    memoType: transaction.memo_type,
    memoValue: transaction.memo,
    ledger: transaction.ledger,
    createdAt: transaction.created_at,
    operationCount: transaction.operation_count,
    successful: transaction.successful,
    horizonUrl: `${STELLAR_TESTNET.horizonUrl}/transactions/${transaction.hash}`,
  };
}
