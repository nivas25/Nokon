import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['razorpay', '@mastra/core', '@mastra/libsql', '@libsql/client'],
};

export default nextConfig;
