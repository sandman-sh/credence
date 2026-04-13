import { NextRequest, NextResponse } from "next/server";
import {
  getCredenceContractId,
  prepareAttestationTransaction,
  submitSignedAttestationTransaction,
} from "@/lib/credence-contract";
import {
  buildAutonomousReview,
  createPaidTask,
  getAgentSnapshotById,
  getAttestationByPaymentHash,
  getBuyerTrustWeight,
  getMinimumAmountForCategory,
  getMppSettlementPlan,
  getSupportedPaymentAssets,
  getPaidTaskByPaymentHash,
  submitAgenticReview,
} from "@/lib/store";
import { taskCategories } from "@/lib/types";
import {
  buildPaymentMemo,
  buildPaymentRequiredBody,
  buildPaymentResponseHeader,
  decodePaymentHeader,
  getHeaderValue,
  selectQuotedAmount,
  X402_HEADERS,
  X402_LEGACY_HEADERS,
  X402PaymentPayload,
} from "@/lib/x402";
import { verifyTestnetSplitPaymentProof } from "@/lib/stellar";

export const dynamic = "force-dynamic";

function paymentRequiredResponse(input: {
  request: NextRequest;
  agentId: string;
  agentWallet: string;
  buyerWallet: string;
  taskCategory: (typeof taskCategories)[number];
  prompt: string;
  amountUsd: number;
  description: string;
  preferredAsset?: string;
}) {
  const memo = buildPaymentMemo({
    agentId: input.agentId,
    buyerWallet: input.buyerWallet,
    taskCategory: input.taskCategory,
    prompt: input.prompt,
  });
  const resource = `/api/hire-agent/${input.agentId}`;
  const selectedAsset =
    getSupportedPaymentAssets(input.amountUsd).find((asset) =>
      asset.code === String(input.preferredAsset ?? "XLM").toUpperCase(),
    ) ?? getSupportedPaymentAssets(input.amountUsd)[0];
  const settlementAsset = selectedAsset.issuer
    ? `${selectedAsset.code}:${selectedAsset.issuer}`
    : selectedAsset.code;
  const body = buildPaymentRequiredBody({
    agentWallet: input.agentWallet,
    agentId: input.agentId,
    taskCategory: input.taskCategory,
    amountUsd: input.amountUsd,
    assets: getSupportedPaymentAssets(input.amountUsd),
    memo,
    resource,
    description: input.description,
    mppSplits: getMppSettlementPlan({
      agentWallet: input.agentWallet,
      amountUsd: input.amountUsd,
      asset: settlementAsset,
    }),
  });

  return NextResponse.json(body, {
    status: 402,
    headers: {
      [X402_HEADERS.paymentRequired]: JSON.stringify(body),
    },
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ agentId: string }> },
) {
  try {
    const { agentId } = await context.params;
    const body = await request.json();

    const agent = getAgentSnapshotById(agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    }

    if (!taskCategories.includes(body.taskCategory)) {
      return NextResponse.json(
        { error: "Unsupported task category." },
        { status: 400 },
      );
    }

    const buyerWallet = String(body.buyerWallet ?? "").trim().toUpperCase();
    const prompt = String(body.prompt ?? "").trim();

    if (!buyerWallet) {
      return NextResponse.json(
        { error: "buyerWallet is required for the autonomous hire flow." },
        { status: 400 },
      );
    }

    if (prompt.length < 24) {
      return NextResponse.json(
        { error: "prompt should be detailed enough for the delivered result and attestation." },
        { status: 400 },
      );
    }

    const quotedAmount = selectQuotedAmount({
      request: body,
      baseRateUsd: Math.max(agent.baseRateUsd, getMinimumAmountForCategory(body.taskCategory)),
    });
    const memo = buildPaymentMemo({
      agentId,
      buyerWallet,
      taskCategory: body.taskCategory,
      prompt,
    });
    const sigHeader = getHeaderValue(
      request.headers,
      X402_HEADERS.paymentSignature,
      X402_LEGACY_HEADERS.paymentSignature,
    );

    if (!sigHeader) {
      return paymentRequiredResponse({
        request,
        agentId,
        agentWallet: agent.wallet,
        buyerWallet,
        taskCategory: body.taskCategory,
        prompt,
        amountUsd: quotedAmount,
        description: `Pay ${agent.name} on Stellar testnet to unlock the ${body.taskCategory} task result through Credence x402.`,
        preferredAsset: String(body.preferredAsset ?? "XLM"),
      });
    }

    const paymentHeaderPayload = decodePaymentHeader<X402PaymentPayload>(sigHeader);
    const payment = paymentHeaderPayload.payload;

    if (
      payment.agentId !== agentId ||
      payment.taskCategory !== body.taskCategory ||
      payment.buyerWallet.trim().toUpperCase() !== buyerWallet
    ) {
      return NextResponse.json(
        { error: "Payment payload does not match this hire request." },
        { status: 400 },
      );
    }

    if (payment.memo !== memo) {
      return NextResponse.json(
        { error: "Payment memo does not match the quoted x402 requirement." },
        { status: 400 },
      );
    }

    const acceptedAssetIds = getSupportedPaymentAssets(quotedAmount).map((asset) =>
      asset.issuer ? `${asset.code}:${asset.issuer}` : asset.code,
    );
    if (!acceptedAssetIds.includes(payment.asset)) {
      return NextResponse.json(
        { error: "Payment asset is not accepted for this agent." },
        { status: 400 },
      );
    }

    const settlementPlan = getMppSettlementPlan({
      agentWallet: agent.wallet,
      amountUsd: quotedAmount,
      asset: payment.asset,
    });

    const existingAttestation = getAttestationByPaymentHash(payment.paymentTxHash);
    if (existingAttestation) {
      return NextResponse.json({
        stage: "completed",
        agentId,
        buyerWallet,
        paymentTxHash: payment.paymentTxHash,
        taskCategory: existingAttestation.taskCategory,
        amountPaid: existingAttestation.amountPaid,
        paymentAsset: payment.asset,
        result: existingAttestation.taskSummary,
        paymentSplits: settlementPlan,
        marketplace: undefined,
        agent: getAgentSnapshotById(agentId),
        attestation: {
          status: "completed",
          reviewNonce: existingAttestation.reviewNonce ?? "",
          success: existingAttestation.success,
          reviewRating: existingAttestation.reviewRating,
          comment: existingAttestation.comment,
          contractId: existingAttestation.contractId,
          contractTxHash: existingAttestation.contractTxHash,
          contractLedger: existingAttestation.contractLedger,
        },
      });
    }

    const existingJob = getPaidTaskByPaymentHash(payment.paymentTxHash);
    const reviewDraft = buildAutonomousReview({
      agent,
      request: body,
      amountPaid: payment.amountPaid,
    });

    if (body.signedAttestationXdr) {
      if (!existingJob) {
        return NextResponse.json(
          { error: "No verified payment job exists yet for this signed attestation submission." },
          { status: 400 },
        );
      }

      const chainReceipt = await submitSignedAttestationTransaction(
        String(body.signedAttestationXdr),
      );
      const result = await submitAgenticReview({
        agentId,
        buyerWallet,
        reviewNonce: existingJob.reviewNonce,
        paymentTxHash: existingJob.paymentTxHash,
        taskCategory: existingJob.taskCategory,
        success: reviewDraft.success,
        reviewRating: reviewDraft.reviewRating,
        comment: reviewDraft.comment,
        signerWallet: buyerWallet,
        reviewSignature: chainReceipt.signatureDigest,
        contractId: chainReceipt.contractId,
        contractTxHash: chainReceipt.hash,
        contractLedger: chainReceipt.ledger,
      });

      const buyerWeight = getBuyerTrustWeight(buyerWallet);

      return NextResponse.json(
        {
          stage: "completed",
          agentId,
          buyerWallet,
          paymentTxHash: existingJob.paymentTxHash,
          taskCategory: existingJob.taskCategory,
          amountPaid: existingJob.amountPaid,
          paymentAsset: payment.asset,
          result: existingJob.result,
          verification: existingJob.verification,
          paymentSplits: settlementPlan,
          marketplace: result.marketplace,
          agent: result.agent,
          reputationDelta: {
            buyerWeight,
            category: existingJob.taskCategory,
            amountWeight: Number((existingJob.amountPaid / agent.baseRateUsd).toFixed(2)),
            projectedScore: result.agent?.overallScore ?? agent.overallScore,
          },
          attestation: {
            status: "completed",
            reviewNonce: existingJob.reviewNonce,
            success: reviewDraft.success,
            reviewRating: reviewDraft.reviewRating,
            comment: reviewDraft.comment,
            contractId: chainReceipt.contractId,
            contractTxHash: chainReceipt.hash,
            contractLedger: chainReceipt.ledger,
          },
        },
        {
          headers: {
            [X402_HEADERS.paymentResponse]: buildPaymentResponseHeader({
              buyerWallet,
              paymentTxHash: existingJob.paymentTxHash,
              agentId,
              taskCategory: existingJob.taskCategory,
              amountPaid: existingJob.amountPaid,
              asset: payment.asset,
              memo,
            }),
          },
        },
      );
    }

    const job =
      existingJob ??
      (await createPaidTask({
        agentId,
        buyerWallet,
        paymentTxHash: payment.paymentTxHash,
        taskCategory: body.taskCategory,
        amountPaid: payment.amountPaid,
        prompt,
        verificationOverride: await verifyTestnetSplitPaymentProof({
          buyerWallet,
          paymentTxHash: payment.paymentTxHash,
          expectedMemo: memo,
          splits: settlementPlan,
        }),
      }));

    if (!getCredenceContractId()) {
      return NextResponse.json(
        {
          error: "Credence Soroban contract is not configured for autonomous attestations.",
        },
        { status: 500 },
      );
    }

    const envelope = await prepareAttestationTransaction({
      agentId,
      agentWallet: agent.wallet,
      buyerWallet,
      reviewNonce: job.reviewNonce,
      paymentTxHash: job.paymentTxHash,
      taskCategory: job.taskCategory,
      success: reviewDraft.success,
      reviewRating: reviewDraft.reviewRating,
      comment: reviewDraft.comment,
      amountPaid: job.amountPaid,
      taskSummary: job.result,
      verifiedLedger: job.verification.ledger,
      horizonUrl: job.verification.horizonUrl,
    });

    return NextResponse.json(
      {
        stage: "payment_verified",
        agentId,
        buyerWallet,
        paymentTxHash: job.paymentTxHash,
        taskCategory: job.taskCategory,
        amountPaid: job.amountPaid,
        paymentAsset: payment.asset,
        result: job.result,
        verification: job.verification,
        paymentSplits: settlementPlan,
        reputationDelta: {
          buyerWeight: getBuyerTrustWeight(buyerWallet),
          category: job.taskCategory,
          amountWeight: Number((job.amountPaid / agent.baseRateUsd).toFixed(2)),
          projectedScore: agent.overallScore,
        },
        attestation: {
          status: "buyer_signature_required",
          reviewNonce: job.reviewNonce,
          success: reviewDraft.success,
          reviewRating: reviewDraft.reviewRating,
          comment: reviewDraft.comment,
          contractId: envelope.contractId,
          preparedEnvelope: envelope,
        },
      },
      {
        headers: {
          [X402_HEADERS.paymentResponse]: buildPaymentResponseHeader({
            buyerWallet,
            paymentTxHash: job.paymentTxHash,
            agentId,
            taskCategory: job.taskCategory,
            amountPaid: job.amountPaid,
            asset: payment.asset,
            memo,
          }),
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to complete the Credence autonomous hire flow.",
      },
      { status: 400 },
    );
  }
}
