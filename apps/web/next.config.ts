import path from "node:path";
import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const withMDX = createMDX({
  extension: /\.(md|mdx)$/,
});

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  // This app lives at apps/web, not the workspace root — without this, Next
  // infers the root by walking up looking for a lockfile, which is fragile
  // the moment more than one lockfile-like file exists anywhere above it.
  // This affects OUTPUT FILE TRACING (build-time serverless bundling) only.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // Turbopack has its OWN, separate root setting — per Next's own type
  // declarations, "only files [at or below] this directory can be resolved
  // by turbopack." Left unset, it isn't guaranteed to match
  // outputFileTracingRoot, and packages/* sit OUTSIDE apps/web (siblings,
  // not descendants) — exactly the case where Turbopack's dev-mode watcher
  // can silently fail to pick up changes in a transpiled workspace package,
  // even though the module itself resolves and compiles fine once.
  turbopack: {
    root: path.join(__dirname, "../../"),
  },
  // Workspace packages (packages/ui, packages/blocks) ship as plain TS
  // source, not pre-built dist output — this is what makes them participate
  // in Next's normal compilation (and Fast Refresh) instead of behaving like
  // an opaque, already-built node_modules dependency.
  transpilePackages: ["@unlockpi/ui", "@unlockpi/blocks"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "img-src * data: blob:;",
          },
        ],
      },
    ];
  },
};

export default withMDX(nextConfig);
