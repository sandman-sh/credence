import { NextResponse } from "next/server";
import { getVerifierSummaryByWallet, syncOnchainAttestationsForWallet } from "@/lib/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ wallet: string }> },
) {
  const { wallet } = await context.params;
  const onchain = await syncOnchainAttestationsForWallet(wallet).catch(() => null);
  const summary = getVerifierSummaryByWallet(wallet);

  if (!summary) {
    return NextResponse.json(
      { error: "Agent wallet not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ...summary,
    onchain: onchain ?? undefined,
  });
}
