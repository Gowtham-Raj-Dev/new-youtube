import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export served by Firebase Hosting. All data is loaded client-side
  // through the Firebase SDK; server work lives in Cloud Functions / Cloud Run.
  output: "export",
  images: { unoptimized: true },
  transpilePackages: ["@shortflow/shared"],
  reactStrictMode: true,
};

export default nextConfig;
