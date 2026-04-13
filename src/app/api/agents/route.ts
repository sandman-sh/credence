import { NextResponse } from "next/server";
import { getMarketplaceSnapshot } from "@/lib/store";

export async function GET() {
  return NextResponse.json({
    agents: getMarketplaceSnapshot().agents,
  });
}
