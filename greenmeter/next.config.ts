import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "applicationinsights",
    "diagnostic-channel",
    "diagnostic-channel-publishers",
  ],
};

export default nextConfig;
