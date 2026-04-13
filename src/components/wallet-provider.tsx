"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { connectFreighterWallet } from "@/lib/freighter";

type WalletContextValue = {
  connectedWallet: string;
  walletPending: boolean;
  walletError: string | null;
  connectWallet: () => Promise<string>;
  disconnectWallet: () => void;
  clearWalletError: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [connectedWallet, setConnectedWallet] = useState("");
  const [walletPending, setWalletPending] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  async function connectWallet() {
    setWalletPending(true);
    setWalletError(null);

    try {
      const address = await connectFreighterWallet();
      setConnectedWallet(address);
      return address;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to connect wallet.";
      setWalletError(message);
      throw error;
    } finally {
      setWalletPending(false);
    }
  }

  function disconnectWallet() {
    setConnectedWallet("");
    setWalletError(null);
  }

  function clearWalletError() {
    setWalletError(null);
  }

  const value = useMemo(
    () => ({
      connectedWallet,
      walletPending,
      walletError,
      connectWallet,
      disconnectWallet,
      clearWalletError,
    }),
    [connectedWallet, walletError, walletPending],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);

  if (!context) {
    throw new Error("useWallet must be used inside WalletProvider.");
  }

  return context;
}
