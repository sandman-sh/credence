import { NextResponse } from "next/server";
import { getTestnetNetworkSummary } from "@/lib/stellar";

export async function GET() {
  try {
    const summary = await getTestnetNetworkSummary();
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch Stellar testnet status.",
      },
      { status: 503 },
    );
  }
}
