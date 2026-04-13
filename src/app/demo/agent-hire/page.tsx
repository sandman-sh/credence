import { AgentHireDemoExperience } from "@/components/agent-hire-demo-experience";
import { getCredenceContractId } from "@/lib/credence-contract";
import { getMarketplaceSnapshot } from "@/lib/store";
import { getTestnetNetworkSummary } from "@/lib/stellar";

export const dynamic = "force-dynamic";

const demoTranscript = [
  { tone: "info", text: ">> Discover" },
  { tone: "accent", text: "Connecting to /api/marketplace and loading trusted agent profiles..." },
  { tone: "success", text: "Selected Aurora Bench as the top research agent by score, category strength, and paid completions." },
  { tone: "info", text: ">> 402 Challenge" },
  { tone: "accent", text: "POST /api/hire-agent/aurora-bench returned HTTP 402 with Stellar testnet x402 metadata." },
  { tone: "accent", text: "Memo quoted: credence-e2e4ad135f24" },
  { tone: "accent", text: "MPP split plan received: 75% seller / 15% platform / 10% reserve." },
  { tone: "info", text: ">> MPP Payment" },
  { tone: "success", text: "Built one Stellar transaction with three payment operations and submitted it successfully." },
  { tone: "accent", text: "Payment tx hash: 8685e96672998c539a9281c790b25c333b9b3e5f6e3d051b8b31e00efdffbfac" },
  { tone: "info", text: ">> Task Result" },
  { tone: "success", text: "Credence verified the split transaction on Horizon, unlocked the mock result, and prepared the Soroban attestation envelope." },
  { tone: "info", text: ">> Attestation Confirmed" },
  { tone: "success", text: "Buyer agent signed the XDR locally and retried the same endpoint to finalize the onchain attestation." },
  { tone: "accent", text: "Soroban tx hash: 1f7d575e19a1eb8485b4df6c863e7fd5221ef4eaeb84756c726a89d3b5bf0459" },
  { tone: "info", text: ">> Reputation Update" },
  { tone: "success", text: "Aurora Bench reputation increased from 75 to 76 after the completed autonomous paid task." },
] as const;

export default async function AgentHireDemoPage() {
  const snapshot = getMarketplaceSnapshot();
  const leadAgent = snapshot.agents[0];
  const contractId = getCredenceContractId() || null;
  const network = await getTestnetNetworkSummary().catch(() => null);

  return (
    <AgentHireDemoExperience
      leadAgent={leadAgent}
      latestLedger={network?.latestLedger ?? 0}
      contractId={contractId}
      transcript={[...demoTranscript]}
      finalResult={{
        paymentTxHash: "8685e96672998c539a9281c790b25c333b9b3e5f6e3d051b8b31e00efdffbfac",
        contractTxHash: "1f7d575e19a1eb8485b4df6c863e7fd5221ef4eaeb84756c726a89d3b5bf0459",
        contractLedger: 1962571,
        reputationBefore: 75,
        reputationAfter: 76,
        result:
          'Aurora Bench scanned the request and returned a concise market brief for "Analyze why payment-backed agent reputation on Stellar is better for autonomous hiring than self-claimed profiles.". Key takeaways: demand is strongest where buyers can verify prior work, category-specific trust signals matter more than generic ratings, and payment-backed reviews create a cleaner market than self-claimed skill lists.',
        paymentSplits: [
          {
            recipient: "GBEPMSQFVXNJQ6OCV7MRZURWAHRNIWNKXAH3UGNT6RUR5M2UTRG2G4YJ",
            role: "agent",
            shareBps: 7500,
            amount: "1.2000000",
            asset: "XLM",
          },
          {
            recipient: "GDOZKUS77S5AHKGN5NUQEYQJXIROQGJNRL4RTGGP2DCXVRO3K3NOBPKP",
            role: "platform",
            shareBps: 1500,
            amount: "0.2400000",
            asset: "XLM",
          },
          {
            recipient: "GCNKNSNDTZ43HRI4BA5SFDYDIIAUYVZRWAO44HWAS3FNIUBWNRSXP4O5",
            role: "reserve",
            shareBps: 1000,
            amount: "0.1600000",
            asset: "XLM",
          },
        ],
      }}
    />
  );
}
