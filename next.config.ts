import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
  serverExternalPackages: ["@xenova/transformers", "onnxruntime-node"],
  experimental: {
    instrumentationHook: true,
    outputFileTracingIncludes: {
      "/**/*": ["./node_modules/onnxruntime-node/bin/napi/v3-linux-x64/**/*.so"]
    }
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
