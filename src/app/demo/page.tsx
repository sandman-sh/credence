import { DemoExperience } from "@/components/demo-experience";
import { getCredenceContractId } from "@/lib/credence-contract";
import { getTestnetNetworkSummary } from "@/lib/stellar";
import {
  getMarketplaceSnapshot,
  getReviewDepositPolicy,
  listDisputes,
} from "@/lib/store";
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

export default async function DemoPage() {
  const snapshot = getMarketplaceSnapshot();
  const disputes = listDisputes();
  const reviewDepositPolicy = getReviewDepositPolicy();
  const contractId = getCredenceContractId();
  const networkSummary =
    (await getTestnetNetworkSummary().catch(() => fallbackNetworkSummary)) ??
    fallbackNetworkSummary;

  return (
    <DemoExperience
      snapshot={snapshot}
      networkSummary={networkSummary}
      disputes={disputes}
      contractId={contractId}
      reviewDepositPolicy={reviewDepositPolicy}
    />
  );
}
