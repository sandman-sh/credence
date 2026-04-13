import { NextRequest, NextResponse } from "next/server";
import {
  createPaidTask,
  getAgentSnapshotById,
  getMinimumAmountForCategory,
  getSupportedPaymentAssets,
} from "@/lib/store";
import { taskCategories } from "@/lib/types";
import {
  buildPaymentRequiredBody,
  buildPaymentResponseHeader,
  decodePaymentHeader,
  getHeaderValue,
  X402_HEADERS,
  X402_LEGACY_HEADERS,
  X402PaymentPayload,
} from "@/lib/x402";

function paymentRequiredResponse(input: {
  agentWallet: string;
  agentId: string;
  taskCategory: (typeof taskCategories)[number];
  amountPaid: number;
}) {
  const body = buildPaymentRequiredBody({
    agentWallet: input.agentWallet,
    agentId: input.agentId,
    taskCategory: input.taskCategory,
    amountUsd: input.amountPaid,
    assets: getSupportedPaymentAssets(input.amountPaid),
    memo: "credence-manual",
    resource: "/api/x402/task",
    description: `Pay the selected agent wallet and retry this request with a signed payment receipt for ${input.taskCategory}.`,
  });
  return NextResponse.json(body, {
    status: 402,
    headers: {
      [X402_HEADERS.paymentRequired]: JSON.stringify(body),
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!taskCategories.includes(body.taskCategory)) {
      return NextResponse.json(
        { error: "Unsupported task category." },
        { status: 400 },
      );
    }

    const buyerWalletFallback = String(body.buyerWallet ?? "");
    const paymentTxHashFallback = String(body.paymentTxHash ?? "");
    const paymentSignatureHeader = getHeaderValue(
      request.headers,
      X402_HEADERS.paymentSignature,
      X402_LEGACY_HEADERS.paymentSignature,
    );

    let paymentHeaderPayload: X402PaymentPayload | null = null;
    if (paymentSignatureHeader) {
      paymentHeaderPayload = decodePaymentHeader<X402PaymentPayload>(
        paymentSignatureHeader,
      );
    }

    const buyerWallet =
      paymentHeaderPayload?.payload.buyerWallet ??
      request.headers.get("x-stellar-buyer-wallet") ??
      buyerWalletFallback;
    const paymentTxHash =
      paymentHeaderPayload?.payload.paymentTxHash ??
      request.headers.get("x-stellar-payment-tx-hash") ??
      paymentTxHashFallback;
    const commercialAmount =
      paymentHeaderPayload?.payload.amountPaid ?? Number(body.amountPaid ?? 0);

    const agentWallet =
      String(body.agentWallet ?? "") ||
      getAgentSnapshotById(String(body.agentId ?? ""))?.wallet ||
      "";

    if (!buyerWallet.trim() || !paymentTxHash.trim()) {
      return paymentRequiredResponse({
        agentWallet,
        agentId: String(body.agentId ?? ""),
        taskCategory: body.taskCategory,
        amountPaid: getMinimumAmountForCategory(body.taskCategory),
      });
    }

    const job = await createPaidTask({
      agentId: String(body.agentId ?? ""),
      buyerWallet,
      paymentTxHash,
      taskCategory: body.taskCategory,
      amountPaid: commercialAmount,
      prompt: String(body.prompt ?? ""),
    });

    return NextResponse.json(
      {
        job,
        reviewEligible: true,
        paywall: "cleared",
      },
      {
        headers: {
          [X402_HEADERS.paymentResponse]: buildPaymentResponseHeader({
            agentId: job.agentId,
            buyerWallet: job.buyerWallet,
            paymentTxHash: job.paymentTxHash,
            taskCategory: job.taskCategory,
            amountPaid: job.amountPaid,
            asset: job.verification.transferredAsset,
            memo: paymentHeaderPayload?.payload.memo ?? "",
          }),
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to process paid task.",
      },
      { status: 400 },
    );
  }
}
