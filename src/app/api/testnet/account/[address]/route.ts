import { NextResponse } from "next/server";
import { getTestnetAccountSummary } from "@/lib/stellar";

export async function GET(
  _request: Request,
  context: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await context.params;
    const account = await getTestnetAccountSummary(address);
    return NextResponse.json(account);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch the Stellar account.",
      },
      { status: 400 },
    );
  }
}
