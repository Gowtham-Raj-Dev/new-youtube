import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export served by Firebase Hosting. All data is loaded client-side
  // through the Firebase SDK; server work lives in Cloud Functions / Cloud Run.
  output: "export",
  images: { unoptimized: true },
  transpilePackages: ["@shortflow/shared"],
  reactStrictMode: true,
  // The dev-only Next.js badge would sit on the sidebar's profile card.
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
