import { describe, expect, it } from "vitest";
import {
  buildPaymentRequiredBody,
  buildPaymentResponseHeader,
  decodePaymentHeader,
} from "@/lib/x402";

describe("x402 helpers", () => {
  it("builds payment requirements with agent pay-to details", () => {
    const requirements = buildPaymentRequiredBody({
      agentWallet: "GATESTAGENTWALLET0000000000000000000000000000000000000000",
      agentId: "aurora-bench",
      taskCategory: "research",
      amountPaid: 2.5,
    });

    expect(requirements.accepts).toHaveLength(1);
    expect(requirements.accepts[0]?.payTo).toContain("GATESTAGENTWALLET");
    expect(requirements.accepts[0]?.maxAmountRequired).toBe("2.50");
  });

  it("round-trips the payment response payload header", () => {
    const header = buildPaymentResponseHeader({
      agentId: "aurora-bench",
      buyerWallet: "gbuyerwallet",
      paymentTxHash: "hash-123",
      taskCategory: "analysis",
      amountPaid: 1.8,
      prompt: "Analyze the agent.",
    });

    const decoded = decodePaymentHeader<{
      payload: { buyerWallet: string; paymentTxHash: string; amountPaid: number };
    }>(header);

    expect(decoded.payload.buyerWallet).toBe("GBUYERWALLET");
    expect(decoded.payload.paymentTxHash).toBe("hash-123");
    expect(decoded.payload.amountPaid).toBe(1.8);
  });
});
