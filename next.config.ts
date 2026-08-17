import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
  serverExternalPackages: ["@xenova/transformers", "onnxruntime-node"],
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
