import { NextRequest, NextResponse } from "next/server";
import { submitSignedAttestationTransaction } from "@/lib/credence-contract";
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

    const signerWallet = String(body.signerWallet ?? "").trim().toUpperCase();
    const buyerWallet = String(body.buyerWallet ?? "").trim().toUpperCase();

    if (!signerWallet || signerWallet !== buyerWallet) {
      return NextResponse.json(
        { error: "The signed review must come from the buyer wallet." },
        { status: 400 },
      );
    }

    const chainReceipt = await submitSignedAttestationTransaction(
      String(body.signedTransactionXdr ?? ""),
    );

    const result = await submitReview({
      agentId: String(body.agentId ?? ""),
      buyerWallet,
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
      signerWallet,
      reviewSignature: chainReceipt.signatureDigest,
      contractId: chainReceipt.contractId,
      contractTxHash: chainReceipt.hash,
      contractLedger: chainReceipt.ledger,
      signedTransactionXdr: String(body.signedTransactionXdr ?? ""),
    });

    return NextResponse.json({
      ...result,
      chainReceipt,
    });
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
