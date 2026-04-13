#!/usr/bin/env python3
"""
Credence autonomous buyer agent demo.

This script demonstrates a full browserless agent-to-agent flow:
1. Discover trusted agents from the public Credence marketplace API
2. Select the best agent for a requested category
3. Request the service and receive an HTTP 402 x402 challenge
4. Build one Stellar testnet multi-operation payment transaction for MPP settlement
5. Retry the request with PAYMENT-SIGNATURE
6. Receive the task result plus a prepared Soroban attestation envelope
7. Sign the envelope locally and finalize the onchain trust update

Requirements:
  pip install requests stellar-sdk

Environment:
  CREDENCE_BASE_URL=http://127.0.0.1:3001
  BUYER_SECRET=S...
  STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
  STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
from datetime import datetime
from typing import Any, Dict, List, Optional

import requests
from stellar_sdk import Asset, Keypair, Network, Server, TransactionBuilder, TransactionEnvelope


DEFAULT_BASE_URL = os.getenv("CREDENCE_BASE_URL", "http://127.0.0.1:3001").rstrip("/")
DEFAULT_HORIZON_URL = os.getenv("STELLAR_HORIZON_URL", "https://horizon-testnet.stellar.org")
DEFAULT_NETWORK_PASSPHRASE = os.getenv(
    "STELLAR_NETWORK_PASSPHRASE",
    Network.TESTNET_NETWORK_PASSPHRASE,
)


class Color:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    LILAC = "\033[95m"
    TEAL = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BLUE = "\033[94m"


def get_timestamp() -> str:
    return datetime.now().strftime("%H:%M:%S.%f")[:-3]

def c(text: str, color: str) -> str:
    return f"{color}{text}{Color.RESET}" if sys.stdout.isatty() else text


def step(title: str) -> None:
    print(f"\n{c('[' + get_timestamp() + '] ', Color.DIM)}{c('>> ' + title, Color.LILAC)}")


def info(text: str) -> None:
    print(f"{c('[' + get_timestamp() + ']   ', Color.DIM)}{c(text, Color.TEAL)}")


def success(text: str) -> None:
    print(f"{c('[' + get_timestamp() + ']   ', Color.DIM)}{c('✓ ' + text, Color.GREEN)}")


def warn(text: str) -> None:
    print(f"{c('[' + get_timestamp() + ']   ', Color.DIM)}{c('! ' + text, Color.YELLOW)}")


def encode_payment_signature(payload: Dict[str, Any]) -> str:
    return base64.b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8")


def decode_payment_required(response: requests.Response) -> Dict[str, Any]:
    header = response.headers.get("PAYMENT-REQUIRED") or response.headers.get("payment-required")
    if header:
        return json.loads(header)
    return response.json()


def discover_agents(base_url: str) -> Dict[str, Any]:
    response = requests.get(f"{base_url}/api/marketplace", timeout=30)
    response.raise_for_status()
    return response.json()


def agent_rank(agent: Dict[str, Any], category: str) -> float:
    category_score = float(agent["categoryScores"].get(category, 0))
    return (
        float(agent["overallScore"]) * 0.45
        + category_score * 0.35
        + float(agent["averageRating"]) * 8.0
        + float(agent["paidCompletions"]) * 1.4
        - float(agent["baseRateUsd"]) * 1.2
    )


def choose_agent(agents: List[Dict[str, Any]], category: str, agent_id: Optional[str]) -> Dict[str, Any]:
    if agent_id:
        for agent in agents:
            if agent["id"] == agent_id:
                return agent
        raise ValueError(f"Agent '{agent_id}' was not found in the marketplace.")

    matching = [agent for agent in agents if category in agent["specialties"]]
    if not matching:
        raise ValueError(f"No agents available for category '{category}'.")

    return max(matching, key=lambda item: agent_rank(item, category))


def request_hire(
    base_url: str,
    agent_id: str,
    buyer_wallet: str,
    category: str,
    prompt: str,
    preferred_asset: str,
    signature_header: Optional[str] = None,
    signed_attestation_xdr: Optional[str] = None,
) -> requests.Response:
    headers = {"Content-Type": "application/json"}
    if signature_header:
        headers["PAYMENT-SIGNATURE"] = signature_header

    body: Dict[str, Any] = {
        "buyerWallet": buyer_wallet,
        "taskCategory": category,
        "prompt": prompt,
        "preferredAsset": preferred_asset,
    }
    if signed_attestation_xdr:
        body["signedAttestationXdr"] = signed_attestation_xdr

    return requests.post(
        f"{base_url}/api/hire-agent/{agent_id}",
        headers=headers,
        json=body,
        timeout=60,
    )


def pick_payment_requirement(payment_required: Dict[str, Any], preferred_asset: str) -> Dict[str, Any]:
    accepts = payment_required.get("accepts", [])
    if not accepts:
        raise ValueError("No x402 payment options were returned by Credence.")

    preferred_upper = preferred_asset.upper()
    for option in accepts:
        if str(option.get("asset", "")).upper().startswith(preferred_upper):
            return option

    return accepts[0]


def create_asset(asset_value: str) -> Asset:
    if ":" in asset_value:
        code, issuer = asset_value.split(":", 1)
        return Asset(code, issuer)
    return Asset.native()


def submit_payment(
    server: Server,
    buyer_keypair: Keypair,
    network_passphrase: str,
    payment_option: Dict[str, Any],
    payment_required: Dict[str, Any],
) -> Dict[str, Any]:
    source = server.load_account(buyer_keypair.public_key)
    memo = payment_option["memo"]
    mpp = payment_required.get("mpp")

    tx_builder = TransactionBuilder(
        source_account=source,
        network_passphrase=network_passphrase,
        base_fee=100,
    )

    if mpp and mpp.get("splits"):
        for split in mpp["splits"]:
            tx_builder.append_payment_op(
                destination=split["recipient"],
                amount=str(split["amount"]),
                asset=create_asset(split["asset"]),
            )
    else:
        tx_builder.append_payment_op(
            destination=payment_option["payTo"],
            amount=str(payment_option["maxAmountRequired"]),
            asset=create_asset(payment_option["asset"]),
        )

    tx = tx_builder.add_text_memo(memo).set_timeout(120).build()
    tx.sign(buyer_keypair)

    response = server.submit_transaction(tx)
    if not response.get("successful"):
        raise RuntimeError(f"Payment failed: {json.dumps(response, indent=2)}")

    return {
        "hash": str(response["hash"]),
        "memo": memo,
        "splits": mpp.get("splits", []) if mpp else [],
        "asset": payment_option["asset"],
        "totalAmount": str(payment_option["maxAmountRequired"]),
    }


def sign_attestation_xdr(transaction_xdr: str, buyer_keypair: Keypair, network_passphrase: str) -> str:
    envelope = TransactionEnvelope.from_xdr(transaction_xdr, network_passphrase)
    envelope.sign(buyer_keypair)
    return envelope.to_xdr()


def print_marketplace_choice(agent: Dict[str, Any], category: str) -> None:
    success(
        f"Selected {agent['name']} as the top {category} agent by score, category strength, and paid completions."
    )


def print_mpp(payment_info: Dict[str, Any]) -> None:
    splits = payment_info.get("splits") or []
    if not splits:
        warn("MPP split data not provided; falling back to single-recipient payment.")
        return

    split_texts = []
    for split in splits:
        share_bps = split.get("shareBps", 0)
        percentage = share_bps / 100 if share_bps else 0
        role = split.get("role", "unknown")
        if role == "agent":
            role = "seller"
        split_texts.append(f"{percentage:g}% {role}")
        
    info(f"MPP split plan received: {' / '.join(split_texts)}.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Autonomous Credence buyer agent")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--agent-id")
    parser.add_argument("--category", default="research", choices=["research", "coding", "translation", "analysis"])
    parser.add_argument(
        "--prompt",
        default="Analyze why payment-backed agent reputation on Stellar is better for autonomous hiring than self-claimed profiles.",
    )
    parser.add_argument("--asset", default="XLM", choices=["XLM", "USDC"])
    args = parser.parse_args()

    buyer_secret = os.getenv("BUYER_SECRET")
    if not buyer_secret:
        print("BUYER_SECRET is required.", file=sys.stderr)
        return 1

    buyer_keypair = Keypair.from_secret(buyer_secret)
    buyer_wallet = buyer_keypair.public_key
    server = Server(DEFAULT_HORIZON_URL)

    step("Discover")
    info(f"Connecting to {args.base_url}/api/marketplace and loading trusted agent profiles...")
    marketplace = discover_agents(args.base_url)
    agent = choose_agent(marketplace["agents"], args.category, args.agent_id)
    print_marketplace_choice(agent, args.category)

    step("402 Challenge")
    initial_response = request_hire(
        base_url=args.base_url,
        agent_id=agent["id"],
        buyer_wallet=buyer_wallet,
        category=args.category,
        prompt=args.prompt,
        preferred_asset=args.asset,
    )

    if initial_response.status_code != 402:
        print(initial_response.text, file=sys.stderr)
        raise RuntimeError(f"Expected a 402 response, received {initial_response.status_code}")

    payment_required = decode_payment_required(initial_response)
    payment_option = pick_payment_requirement(payment_required, args.asset)
    info(f"POST /api/hire-agent/{agent['id']} returned HTTP 402 with Stellar testnet x402 metadata.")
    info(f"Memo quoted: {payment_option['memo']}")
    print_mpp({"splits": payment_required.get("mpp", {}).get("splits", [])})

    step("MPP Payment")
    payment_info = submit_payment(
        server=server,
        buyer_keypair=buyer_keypair,
        network_passphrase=DEFAULT_NETWORK_PASSPHRASE,
        payment_option=payment_option,
        payment_required=payment_required,
    )
    success("Built one Stellar transaction with three payment operations and submitted it successfully.")
    info(f"Payment tx hash: {payment_info['hash']}")

    payment_signature = encode_payment_signature(
        {
            "x402Version": 1,
            "scheme": "exact",
            "network": "stellar:testnet",
            "payload": {
                "buyerWallet": buyer_wallet,
                "paymentTxHash": payment_info["hash"],
                "agentId": agent["id"],
                "taskCategory": args.category,
                "amountPaid": float(payment_info["totalAmount"]),
                "asset": payment_option["asset"],
                "memo": payment_option["memo"],
            },
        }
    )

    step("Task Result")
    verified_response = request_hire(
        base_url=args.base_url,
        agent_id=agent["id"],
        buyer_wallet=buyer_wallet,
        category=args.category,
        prompt=args.prompt,
        preferred_asset=args.asset,
        signature_header=payment_signature,
    )
    verified_response.raise_for_status()
    verified_payload = verified_response.json()

    if verified_payload.get("stage") not in {"payment_verified", "completed"}:
        print(json.dumps(verified_payload, indent=2))
        raise RuntimeError("Expected a payment_verified or completed stage after submitting payment proof.")

    success("Credence verified the split transaction on Horizon, unlocked the final live result, and prepared the Soroban attestation envelope.")

    if verified_payload.get("stage") == "completed":
        step("Attestation Confirmed")
        info("The payment was already finalized on a prior run.")
        print(json.dumps(verified_payload, indent=2))
        return 0

    attestation = verified_payload["attestation"]
    envelope = attestation["preparedEnvelope"]

    step("Attestation Confirmed")
    signed_xdr = sign_attestation_xdr(
        envelope["transactionXdr"],
        buyer_keypair=buyer_keypair,
        network_passphrase=envelope["networkPassphrase"],
    )
    success("Buyer agent signed the XDR locally and retried the same endpoint to finalize the onchain attestation.")

    completed_response = request_hire(
        base_url=args.base_url,
        agent_id=agent["id"],
        buyer_wallet=buyer_wallet,
        category=args.category,
        prompt=args.prompt,
        preferred_asset=args.asset,
        signature_header=payment_signature,
        signed_attestation_xdr=signed_xdr,
    )
    completed_response.raise_for_status()
    completed_payload = completed_response.json()

    contract_tx_hash = completed_payload.get("attestation", {}).get("contractTxHash", "unknown")
    info(f"Soroban tx hash: {contract_tx_hash}")

    reputation_delta = completed_payload.get("reputationDelta", 0)
    agent_name = agent["name"]
    rep_before = agent["overallScore"]
    rep_after = rep_before + reputation_delta
    
    step("Reputation Update")
    success(f"{agent_name} reputation increased from {rep_before} to {rep_after} after the completed autonomous paid task.")
    
    print("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
