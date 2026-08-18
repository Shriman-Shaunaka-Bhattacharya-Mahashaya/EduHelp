import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
  serverExternalPackages: ["@xenova/transformers", "onnxruntime-node"],
  experimental: {
    instrumentationHook: true,
    outputFileTracingIncludes: {
      "app/api/**/*": ["./node_modules/**/*.so"],
      "api/**/*": ["./node_modules/**/*.so"]
    }
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
