export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 10 ? 2 : 0,
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function shortenWallet(wallet: string) {
  return `${wallet.slice(0, 6)}...${wallet.slice(-6)}`;
}

export function shortenHash(value: string) {
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

export function scoreToTone(score: number) {
  if (score >= 90) return "Elite";
  if (score >= 80) return "Proven";
  if (score >= 70) return "Trusted";
  return "Emerging";
}
