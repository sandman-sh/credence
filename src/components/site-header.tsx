"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  ArrowSquareOut,
  List,
  Plug,
  SignOut,
  Wallet,
  X,
} from "@phosphor-icons/react";
import { shortenWallet } from "@/lib/format";
import { useWallet } from "@/components/wallet-provider";

type SiteHeaderProps = {
  mode?: "landing" | "app" | "profile" | "demo";
};

const navByMode: Record<
  NonNullable<SiteHeaderProps["mode"]>,
  Array<{ href: string; label: string }>
> = {
  landing: [
    { href: "#why", label: "Why Credence" },
    { href: "#flow", label: "How it works" },
    { href: "/demo", label: "Demo" },
    { href: "/demo/agent-hire", label: "Autonomous AI" },
  ],
  app: [
    { href: "/app#directory", label: "Directory" },
    { href: "/app#workspace", label: "Workspace" },
    { href: "/demo", label: "Demo" },
    { href: "/demo/agent-hire", label: "Autonomous AI" },
  ],
  profile: [
    { href: "/app#directory", label: "Directory" },
    { href: "/app#workspace", label: "Workspace" },
    { href: "/demo", label: "Demo" },
    { href: "/demo/agent-hire", label: "Autonomous AI" },
  ],
  demo: [
    { href: "/demo", label: "Overview" },
    { href: "/demo/agent-hire", label: "Agent Hire" },
    { href: "/app#directory", label: "Directory" },
    { href: "/app#workspace", label: "Workspace" },
    { href: "/app#dispute-desk", label: "Disputes" },
  ],
};

const ctaByMode: Record<NonNullable<SiteHeaderProps["mode"]>, { href: string; label: string }> = {
  landing: { href: "/demo/agent-hire", label: "Try Demo" },
  app: { href: "/", label: "Home" },
  profile: { href: "/app", label: "Directory" },
  demo: { href: "/app", label: "Open App" },
};

export function SiteHeader({ mode = "app" }: SiteHeaderProps) {
  const navItems = navByMode[mode];
  const cta = ctaByMode[mode];
  const prefersReducedMotion = useReducedMotion();
  const [mobileOpen, setMobileOpen] = useState(false);

  const {
    connectedWallet,
    walletPending,
    walletError,
    connectWallet,
    disconnectWallet,
    clearWalletError,
  } = useWallet();

  return (
    <>
      <header className="nav-shell">
        <div className="nav-inner">
          {/* Logo */}
          <Link href="/" className="nav-logo" onClick={() => setMobileOpen(false)}>
            <motion.div
              className="nav-logo-mark"
              whileHover={prefersReducedMotion ? undefined : { rotate: -8, scale: 1.08 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              C
            </motion.div>
            <div className="nav-logo-text">
              <span className="nav-logo-name">Credence</span>
              <span className="nav-logo-tagline">Trust layer for AI agents</span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="nav-links" aria-label="Main navigation">
            {navItems.map((item) =>
              item.href.startsWith("/") ? (
                <Link key={item.href} href={item.href} className="nav-link">
                  {item.label}
                </Link>
              ) : (
                <a key={item.href} href={item.href} className="nav-link">
                  {item.label}
                </a>
              )
            )}
          </nav>

          {/* Desktop Actions */}
          <div className="nav-actions">
            {/* Testnet Status */}
            <div className="status-pill hidden sm:inline-flex">
              <span className="status-dot" />
              Testnet
            </div>

            <div className="nav-divider hidden lg:block" />

            {/* Wallet */}
            {connectedWallet ? (
              <div className="flex items-center gap-2">
                <div className="wallet-pill hidden sm:inline-flex">
                  <Wallet size={13} weight="duotone" />
                  {shortenWallet(connectedWallet)}
                </div>
                <motion.button
                  type="button"
                  className="btn-dark"
                  style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem" }}
                  onClick={() => { clearWalletError(); disconnectWallet(); }}
                  whileHover={prefersReducedMotion ? undefined : { y: -1 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                >
                  <SignOut size={14} weight="bold" />
                  Disconnect
                </motion.button>
              </div>
            ) : (
              <motion.button
                type="button"
                className="btn-primary"
                style={{ padding: "0.48rem 1rem", fontSize: "0.84rem" }}
                onClick={() => { clearWalletError(); void connectWallet().catch(() => undefined); }}
                disabled={walletPending}
                whileHover={prefersReducedMotion ? undefined : { y: -2, scale: 1.02 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
              >
                <Plug size={14} weight="duotone" />
                {walletPending ? "Connecting…" : "Connect Wallet"}
              </motion.button>
            )}

            {/* CTA link */}
            <Link href={cta.href} className="btn-ghost hidden lg:inline-flex" style={{ padding: "0.48rem 0.9rem", fontSize: "0.84rem" }}>
              {cta.label}
              <ArrowSquareOut size={14} weight="bold" />
            </Link>

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="btn-ghost lg:hidden"
              style={{ padding: "0.4rem" }}
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
            </button>
          </div>
        </div>

        {/* Wallet error */}
        <AnimatePresence>
          {walletError && (
            <motion.div
              className="alert-error mx-4 mb-3 mt-0"
              style={{ borderRadius: "8px" }}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              {walletError}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />

            {/* Drawer panel */}
            <motion.div
              className="fixed right-0 top-0 z-50 flex h-full w-[280px] flex-col gap-2 bg-[var(--background-elevated)] border-l border-[var(--line)] p-6 lg:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="nav-logo-name">Menu</span>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: "0.35rem" }}
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>

              <nav className="flex flex-col gap-1">
                {navItems.map((item) =>
                  item.href.startsWith("/") ? (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="nav-link"
                      style={{ justifyContent: "flex-start", padding: "0.6rem 0.85rem" }}
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <a
                      key={item.href}
                      href={item.href}
                      className="nav-link"
                      style={{ justifyContent: "flex-start", padding: "0.6rem 0.85rem" }}
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </a>
                  )
                )}
              </nav>

              <div className="panel-divider mt-4" />

              <div className="flex flex-col gap-3 mt-4">
                <div className="status-pill w-fit">
                  <span className="status-dot" />
                  Stellar Testnet
                </div>

                {connectedWallet ? (
                  <>
                    <div className="wallet-pill">
                      <Wallet size={13} weight="duotone" />
                      {shortenWallet(connectedWallet)}
                    </div>
                    <button
                      type="button"
                      className="btn-secondary w-full"
                      onClick={() => { clearWalletError(); disconnectWallet(); setMobileOpen(false); }}
                    >
                      <SignOut size={14} weight="bold" />
                      Disconnect Wallet
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn-primary w-full"
                    onClick={() => { clearWalletError(); void connectWallet().catch(() => undefined); setMobileOpen(false); }}
                    disabled={walletPending}
                  >
                    <Plug size={14} weight="duotone" />
                    {walletPending ? "Connecting…" : "Connect Wallet"}
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
