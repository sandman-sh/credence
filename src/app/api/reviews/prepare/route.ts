import { NextRequest, NextResponse } from "next/server";
import { prepareAttestationTransaction } from "@/lib/credence-contract";
import { getAgentSnapshotById, getPaidTaskByReviewNonce } from "@/lib/store";
import { taskCategories } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!taskCategories.includes(body.taskCategory)) {
      return NextResponse.json(
        { error: "Unsupported task category." },
        { status: 400 },
      );
    }

    const reviewNonce = String(body.reviewNonce ?? "").trim();
    const job = getPaidTaskByReviewNonce(reviewNonce);

    if (!job) {
      return NextResponse.json(
        { error: "No verified paid task found for this review." },
        { status: 404 },
      );
    }

    if (
      job.agentId !== String(body.agentId ?? "") ||
      job.paymentTxHash !== String(body.paymentTxHash ?? "").trim() ||
      job.buyerWallet !== String(body.buyerWallet ?? "").trim().toUpperCase()
    ) {
      return NextResponse.json(
        { error: "Review details do not match the verified paid task." },
        { status: 400 },
      );
    }

    const agent = getAgentSnapshotById(job.agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    }

    const envelope = await prepareAttestationTransaction({
      agentId: job.agentId,
      agentWallet: agent.wallet,
      buyerWallet: job.buyerWallet,
      reviewNonce,
      paymentTxHash: job.paymentTxHash,
      taskCategory: job.taskCategory,
      success: Boolean(body.success),
      reviewRating: Number(body.reviewRating ?? 0),
      comment: String(body.comment ?? ""),
      amountPaid: job.amountPaid,
      taskSummary: job.result,
      verifiedLedger: job.verification.ledger,
      horizonUrl: job.verification.horizonUrl,
    });

    return NextResponse.json({ envelope });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to prepare attestation.",
      },
      { status: 400 },
    );
  }
}
