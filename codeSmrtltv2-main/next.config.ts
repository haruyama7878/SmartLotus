import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const supabaseInternalUrl =
  process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:30800";

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingRoot: projectRoot,
  async rewrites() {
    return [
      {
        // Proxy Supabase Auth qua cung origin (dung khi deploy len server)
        source: "/auth/v1/:path*",
        destination: `${supabaseInternalUrl}/auth/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
