import { NextRequest, NextResponse } from "next/server";
import { submitReview } from "@/lib/store";
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

    const result = await submitReview({
      agentId: String(body.agentId ?? ""),
      buyerWallet: String(body.buyerWallet ?? ""),
      reviewNonce: String(body.reviewNonce ?? ""),
      paymentTxHash: String(body.paymentTxHash ?? ""),
      taskCategory: body.taskCategory,
      success: Boolean(body.success),
      reviewRating: Number(body.reviewRating ?? 0),
      comment: String(body.comment ?? ""),
      reviewDepositTxHash:
        body.reviewDepositTxHash === undefined
          ? undefined
          : String(body.reviewDepositTxHash ?? ""),
      signerWallet:
        body.signerWallet === undefined
          ? undefined
          : String(body.signerWallet ?? ""),
      reviewSignature:
        body.reviewSignature === undefined
          ? undefined
          : String(body.reviewSignature ?? ""),
      signedTransactionXdr:
        body.signedTransactionXdr === undefined
          ? undefined
          : String(body.signedTransactionXdr ?? ""),
      contractId:
        body.contractId === undefined ? undefined : String(body.contractId ?? ""),
      contractTxHash:
        body.contractTxHash === undefined
          ? undefined
          : String(body.contractTxHash ?? ""),
      contractLedger:
        body.contractLedger === undefined
          ? undefined
          : Number(body.contractLedger ?? 0),
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to submit review.",
      },
      { status: 400 },
    );
  }
}
