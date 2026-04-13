import { NextRequest, NextResponse } from "next/server";
import { createPaidTask } from "@/lib/store";
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

    const job = await createPaidTask({
      agentId: String(body.agentId ?? ""),
      buyerWallet: String(body.buyerWallet ?? ""),
      paymentTxHash: String(body.paymentTxHash ?? ""),
      taskCategory: body.taskCategory,
      amountPaid: Number(body.amountPaid ?? 0),
      prompt: String(body.prompt ?? ""),
    });

    return NextResponse.json({
      job,
      reviewEligible: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to process paid task.",
      },
      { status: 400 },
    );
  }
}
