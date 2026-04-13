import { LandingExperience } from "@/components/landing-experience";
import { getTestnetNetworkSummary } from "@/lib/stellar";
import { getMarketplaceSnapshot } from "@/lib/store";
import { TestnetNetworkSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

const fallbackNetworkSummary: TestnetNetworkSummary = {
  networkPassphrase: "Test SDF Network ; September 2015",
  horizonUrl: "https://horizon-testnet.stellar.org",
  friendbotUrl: "https://friendbot.stellar.org",
  latestLedger: 0,
  closedAt: new Date().toISOString(),
  protocolVersion: 0,
  horizonVersion: "unavailable",
};

export default async function Home() {
  const snapshot = getMarketplaceSnapshot();
  const networkSummary =
    (await getTestnetNetworkSummary().catch(() => fallbackNetworkSummary)) ??
    fallbackNetworkSummary;

  return (
    <LandingExperience snapshot={snapshot} networkSummary={networkSummary} />
  );
}
