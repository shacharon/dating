import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isCapacitorBuild } from "./src/lib/platform/capacitor-build";
import { buildImageRemotePatterns } from "./src/lib/platform/image-remote-patterns";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** Prefer 127.0.0.1 over localhost — avoids intermittent IPv6/proxy failures on Windows. */
const apiProxyTarget =
  process.env.API_PROXY_TARGET?.replace(/\/$/, "") ?? "http://127.0.0.1:3001";

const capacitor = isCapacitorBuild();

const nextConfig: NextConfig = {
  /** Standalone for Docker web prod; static export when CAPACITOR_BUILD=1. */
  output: capacitor ? "export" : "standalone",
  /** socket.io handshake must not be 308-redirected between `/socket.io` and `/socket.io/`. */
  skipTrailingSlashRedirect: true,
  /** Avoid picking a parent folder when multiple lockfiles exist (Turbopack workspace root). */
  turbopack: {
    root: projectRoot,
  },
  images: capacitor
    ? { unoptimized: true, remotePatterns: buildImageRemotePatterns() }
    : { remotePatterns: buildImageRemotePatterns() },
  ...(capacitor
    ? {}
    : {
        /**
         * Proxy `/api/*` to dating-api so the browser can call same-origin `/api/...`
         * (session `SameSite=Lax` cookies work). Override target with `API_PROXY_TARGET`.
         */
        async rewrites() {
          return [
            {
              source: "/api/:path*",
              destination: `${apiProxyTarget}/api/:path*`,
            },
            {
              source: "/socket.io",
              destination: `${apiProxyTarget}/socket.io`,
            },
            {
              source: "/socket.io/:path*",
              destination: `${apiProxyTarget}/socket.io/:path*`,
            },
          ];
        },
      }),
};

const uploadEnabled = Boolean(process.env.SENTRY_AUTH_TOKEN?.trim());

const sentryConfig =
  process.env.NODE_ENV === "production"
    ? withSentryConfig(nextConfig, {
        silent: true,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        sourcemaps: {
          disable: !uploadEnabled,
        },
      })
    : nextConfig;

export default sentryConfig;
