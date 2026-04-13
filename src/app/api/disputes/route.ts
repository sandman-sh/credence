import { NextRequest, NextResponse } from "next/server";
import { listDisputes, openDispute, updateDisputeStatus } from "@/lib/store";

export async function GET(request: NextRequest) {
  const paymentTxHash = request.nextUrl.searchParams.get("paymentTxHash") ?? undefined;
  return NextResponse.json({
    disputes: listDisputes(paymentTxHash),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dispute = openDispute({
      paymentTxHash: String(body.paymentTxHash ?? ""),
      openedByWallet: String(body.openedByWallet ?? ""),
      reason: String(body.reason ?? ""),
      details: String(body.details ?? ""),
    });

    return NextResponse.json({ dispute });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to open dispute.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const dispute = updateDisputeStatus({
      id: String(body.id ?? ""),
      status: String(body.status ?? "open") as "open" | "reviewed" | "resolved",
    });

    return NextResponse.json({ dispute });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update dispute.",
      },
      { status: 400 },
    );
  }
}
