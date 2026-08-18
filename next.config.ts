import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist", "pdf-lib", "jpeg-js"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;

if (!process.env.VITEST) {
  import("@opennextjs/cloudflare")
    .then((mod) => mod.initOpenNextCloudflareForDev())
    .catch(() => {
      // Local Next.js still works if Wrangler bindings are unavailable.
    });
}
