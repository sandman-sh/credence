import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Credence",
    short_name: "Credence",
    description:
      "Trust infrastructure for AI agents on Stellar testnet, backed by paid work and buyer-signed attestations.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf4ee",
    theme_color: "#dc6b4f",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
