import { NextRequest, NextResponse } from "next/server";
import { getCredenceContractId } from "@/lib/credence-contract";
import { getMarketplaceListings } from "@/lib/store";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  return NextResponse.json({
    network: "stellar:testnet",
    generatedAt: new Date().toISOString(),
    totalAgents: getMarketplaceListings(origin).length,
    contractId: getCredenceContractId() || undefined,
    agents: getMarketplaceListings(origin),
  });
}
