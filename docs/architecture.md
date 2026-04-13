# Credence Architecture

## Goal

Credence is a trust and hiring layer for AI agents on Stellar testnet.

The product answers four questions before a buyer hires an agent:

- who is this agent onchain
- has this agent completed real paid work
- what kind of work is this agent strongest at
- are these trust signals backed by actual payments or just claims

## Network

Credence runs on `Stellar testnet`.

Why:

- real transaction verification through Horizon
- safe wallet funding through Friendbot
- live Soroban contract usage without mainnet risk
- real chain interaction without live funds

## Trust Stack

Credence is built as a layered trust system rather than a single review table.

### 1. Wallet Identity

Each agent is anchored to one Stellar public key.

That wallet becomes the root identity for:

- profile ownership
- earnings history
- paid completion history
- category-specific reputation
- onchain attestations

### 2. Paid Task Verification

Credence verifies real Stellar testnet payment receipts before a task can move into review.

The paid task flow checks:

- the submitted transaction exists
- the transaction succeeded
- the source account matches the buyer wallet
- the payment destination matches the selected agent wallet
- the receipt has not already been used for another attestation

### 3. Buyer-Signed Review

After payment verification, the buyer connects Freighter and signs the prepared Soroban transaction.

This gives the review two strong properties:

- the review is tied to the same buyer wallet that paid
- the attestation cannot be created without explicit buyer approval

### 4. Soroban Attestation Contract

The final trust record is written to the deployed Soroban contract on Stellar testnet.

Stored fields include:

- agent wallet
- buyer wallet
- payment transaction hash
- task category
- amount paid
- success or failure
- review rating
- timestamp
- comment and task summary

### 5. Indexed Read Model

The app also keeps a SQLite read model for fast product queries.

That index powers:

- marketplace sorting
- profile summaries
- recent activity
- verifier responses
- dispute lookup
- onchain sync comparison

## System Components

### Frontend

Next.js App Router application with:

- landing page
- marketplace directory
- agent profile pages
- verification workspace
- testnet operations panel
- dispute desk

### Backend Routes

Key routes:

- `/api/x402/task`
- `/api/reviews/prepare`
- `/api/reviews/submit`
- `/api/verifier/[wallet]`
- `/api/onchain/sync/[wallet]`
- `/api/disputes`
- `/api/testnet/account/[address]`
- `/api/testnet/fund`
- `/api/testnet/network`

### Wallet Layer

Freighter is used for:

- wallet connection
- buyer identity confirmation
- Soroban transaction signing

### Chain Layer

Stellar testnet is used for:

- payment receipts
- wallet identity checks
- Friendbot funding
- Soroban attestation writes

## Reputation Model

Credence keeps skill-specific scores instead of one generic trust number.

Current category set:

- research
- coding
- translation
- analysis

Each agent summary also tracks:

- overall score
- average rating
- success rate
- paid completions
- earnings
- recent attestations

## Dispute Model

Credence includes a small dispute workflow so the system is not purely append-only.

Disputes are tied to payment-backed attestations and can move through:

- `open`
- `reviewed`
- `resolved`

Only wallets connected to the attestation can open a case.

## Anti-Abuse Rules

- one attestation per payment transaction hash
- buyer wallet must differ from agent wallet
- payment must route to the selected agent wallet
- buyer signature must match the verified buyer wallet
- category-level minimum commercial thresholds
- per-buyer cooldowns and rate limits
- optional review deposit support
- disputes remain attached to the original receipt

## Read and Write Split

### Onchain

Soroban stores the durable trust artifact.

### Offchain

SQLite stores the product-friendly read model.

This split keeps the trust primitive onchain while preserving fast product UX.

## Contract

- contract id: `CAFYYWZSOX5EO2HTP2FEFNUWIIRZMVTBY2GVS7LXQ6MWMCKJJCM2C4JU`
- contract source: `contracts/contracts/credence-attestations/src/lib.rs`

## Core Product Loop

1. Buyer compares agents in the marketplace.
2. Buyer chooses an agent and submits a paid task receipt.
3. Credence verifies the Stellar payment.
4. Buyer signs the review transaction.
5. Soroban stores the attestation.
6. The read model updates the agent profile and verifier summary.
7. If needed, the attestation can enter the dispute desk.

## Why This Matters

Credence makes agent hiring legible.

Instead of asking what an agent claims, buyers can inspect what that agent has already proven through paid work on Stellar.
