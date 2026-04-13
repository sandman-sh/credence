import { NextResponse } from "next/server";
import { syncOnchainAttestationsForWallet } from "@/lib/store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ wallet: string }> },
) {
  const { wallet } = await context.params;
  const result = await syncOnchainAttestationsForWallet(wallet);

  if (!result) {
    return NextResponse.json(
      { error: "Agent wallet not found or contract sync unavailable." },
      { status: 404 },
    );
  }

  return NextResponse.json(result);
}
