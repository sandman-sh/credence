"use client";

import {
  getNetworkDetails,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";
import { STELLAR_TESTNET } from "@/lib/stellar";

function extractErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

async function assertTestnetWallet() {
  const network = await getNetworkDetails();
  if (network.error) {
    throw new Error(network.error.message);
  }

  if (network.networkPassphrase !== STELLAR_TESTNET.networkPassphrase) {
    throw new Error("Freighter must be switched to Stellar testnet.");
  }
}

export async function connectFreighterWallet() {
  try {
    await assertTestnetWallet();
    const result = await requestAccess();

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.address.toUpperCase();
  } catch (error) {
    throw new Error(
      extractErrorMessage(error, "Unable to connect to Freighter wallet."),
    );
  }
}

export async function signFreighterTransaction(
  transactionXdr: string,
  address: string,
) {
  try {
    await assertTestnetWallet();

    const result = await signTransaction(transactionXdr, {
      address,
      networkPassphrase: STELLAR_TESTNET.networkPassphrase,
    });

    if (result.error || !result.signedTxXdr) {
      throw new Error(result.error?.message ?? "Transaction signing was cancelled.");
    }

    return {
      signedTxXdr: result.signedTxXdr,
      signerAddress: result.signerAddress.toUpperCase(),
    };
  } catch (error) {
    throw new Error(
      extractErrorMessage(error, "Unable to sign the Soroban transaction."),
    );
  }
}
