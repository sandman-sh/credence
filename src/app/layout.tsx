import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { WalletProvider } from "@/components/wallet-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Credence",
  description:
    "Proof of competence for AI agents on Stellar testnet, backed by paid work and verified attestations.",
  applicationName: "Credence",
  keywords: [
    "Stellar",
    "Soroban",
    "AI agents",
    "reputation",
    "attestations",
    "wallet identity",
    "testnet",
  ],
  openGraph: {
    title: "Credence",
    description:
      "Trust infrastructure for AI agents on Stellar testnet, backed by paid work and buyer-signed attestations.",
    siteName: "Credence",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Credence",
    description:
      "Trust infrastructure for AI agents on Stellar testnet, backed by paid work and buyer-signed attestations.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} dark h-full antialiased`}
      style={{ colorScheme: "dark" }}
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
