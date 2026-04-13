import { MarketplaceExperience } from "@/components/marketplace-experience";
import { getTestnetNetworkSummary } from "@/lib/stellar";
import { getMarketplaceSnapshot, listDisputes } from "@/lib/store";
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

export default async function AppPage() {
  const snapshot = getMarketplaceSnapshot();
  const disputes = listDisputes();
  const networkSummary =
    (await getTestnetNetworkSummary().catch(() => fallbackNetworkSummary)) ??
    fallbackNetworkSummary;

  return (
    <MarketplaceExperience
      initialSnapshot={snapshot}
      initialNetworkSummary={networkSummary}
      initialDisputes={disputes}
    />
  );
}
