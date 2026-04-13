import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import {
  HireAgentRequest,
  PaymentSplit,
  SupportedPaymentAsset,
  TaskCategory,
} from "@/lib/types";

export const X402_HEADERS = {
  paymentRequired: "PAYMENT-REQUIRED",
  paymentResponse: "PAYMENT-RESPONSE",
  paymentSignature: "PAYMENT-SIGNATURE",
} as const;

export const X402_LEGACY_HEADERS = {
  paymentRequired: "payment-required",
  paymentResponse: "payment-response",
  paymentSignature: "payment-signature",
} as const;

type X402Accept = {
  scheme: "exact";
  network: "stellar:testnet";
  payTo: string;
  asset: string;
  maxAmountRequired: string;
  description: string;
  resource: string;
  mimeType: "application/json";
  outputSchema: string;
  memo: string;
};

export type X402PaymentRequired = {
  x402Version: number;
  error: string;
  accepts: X402Accept[];
  mpp?: {
    mode: "stellar-operation-split";
    network: "stellar:testnet";
    description: string;
    splits: PaymentSplit[];
  };
};

export type X402PaymentPayload = {
  x402Version: number;
  scheme: "exact";
  network: "stellar:testnet";
  payload: {
    buyerWallet: string;
    paymentTxHash: string;
    agentId: string;
    taskCategory: TaskCategory;
    amountPaid: number;
    asset: string;
    memo: string;
  };
};

export function encodePaymentHeader(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64");
}

export function decodePaymentHeader<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64").toString("utf8")) as T;
}

export function getHeaderValue(headers: Headers, primary: string, legacy: string) {
  return headers.get(primary) ?? headers.get(legacy);
}

export function buildPaymentMemo(input: {
  agentId: string;
  buyerWallet: string;
  taskCategory: TaskCategory;
  prompt: string;
}) {
  const digest = createHash("sha256")
    .update(
      [
        input.agentId,
        input.buyerWallet.trim().toUpperCase(),
        input.taskCategory,
        input.prompt.trim(),
      ].join("|"),
    )
    .digest("hex")
    .slice(0, 12);

  return `credence-${digest}`;
}

export function selectQuotedAmount(input: {
  request: HireAgentRequest;
  baseRateUsd: number;
}) {
  const requestedCap =
    typeof input.request.maxAmountUsd === "number" && input.request.maxAmountUsd > 0
      ? input.request.maxAmountUsd
      : undefined;

  if (!requestedCap) {
    return Number(input.baseRateUsd.toFixed(2));
  }

  return Number(Math.max(input.baseRateUsd, requestedCap).toFixed(2));
}

export function buildPaymentRequiredBody(input: {
  agentWallet: string;
  agentId: string;
  taskCategory: TaskCategory;
  amountUsd: number;
  assets: SupportedPaymentAsset[];
  memo: string;
  resource: string;
  description: string;
  mppSplits?: PaymentSplit[];
}): X402PaymentRequired {
  return {
    x402Version: 1,
    error: "Payment required before Credence can unlock this agent service.",
    accepts: input.assets.map((asset) => ({
      scheme: "exact",
      network: "stellar:testnet",
      payTo: input.agentWallet,
      asset: asset.issuer ? `${asset.code}:${asset.issuer}` : asset.code,
      maxAmountRequired: asset.amount,
      description: input.description,
      resource: input.resource,
      mimeType: "application/json",
      outputSchema: "credence/hire-agent-result@v1",
      memo: input.memo,
    })),
    mpp: input.mppSplits?.length
      ? {
          mode: "stellar-operation-split",
          network: "stellar:testnet",
          description:
            "Submit one Stellar transaction containing all listed payment operations with the quoted memo.",
          splits: input.mppSplits,
        }
      : undefined,
  };
}

export function buildPaymentResponseHeader(input: {
  buyerWallet: string;
  paymentTxHash: string;
  agentId: string;
  taskCategory: TaskCategory;
  amountPaid: number;
  asset: string;
  memo: string;
}) {
  return encodePaymentHeader({
    x402Version: 1,
    scheme: "exact",
    network: "stellar:testnet",
    payload: {
      buyerWallet: input.buyerWallet.trim().toUpperCase(),
      paymentTxHash: input.paymentTxHash.trim(),
      agentId: input.agentId,
      taskCategory: input.taskCategory,
      amountPaid: Number(input.amountPaid),
      asset: input.asset,
      memo: input.memo,
    },
  } satisfies X402PaymentPayload);
}
