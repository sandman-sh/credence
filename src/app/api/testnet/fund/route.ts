import { NextRequest, NextResponse } from "next/server";
import { fundTestnetAccount } from "@/lib/stellar";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await fundTestnetAccount(String(body.address ?? ""));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to fund the testnet account.",
      },
      { status: 400 },
    );
  }
}
