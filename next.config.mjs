import process from "node:process"
import bundleAnalyzer from "@next/bundle-analyzer"

const isDev = process.env.NODE_ENV === "development"

// Opt-in bundle analysis: `npm run analyze` (ANALYZE=1) opens the treemap after a build so the
// first-load JS impact of optimizePackageImports / demand-loading changes is measurable.
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "1" })

// NOTE: Content-Security-Policy is set per-request in proxy.ts so it can carry a nonce and
// drop `script-src 'unsafe-inline'` in production. The remaining static security headers stay here.
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Wallet flows (Coinbase Smart Wallet, WalletConnect, social logins) open auth
    // popups and post back via window.opener. "same-origin-allow-popups" keeps the
    // opener reference reachable for those popups while still isolating cross-origin
    // documents — a stricter "same-origin" would null window.opener and break them.
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
  {
    key: "Permissions-Policy",
    value:
      "accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), publickey-credentials-get=(), usb=()",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Playwright and local mobile-device testing use the loopback host while the
  // dev server may bind as localhost. Next otherwise blocks the client chunks/HMR
  // request and leaves client-only session hydration at its server skeleton.
  allowedDevOrigins: isDev ? ["127.0.0.1"] : undefined,
  experimental: {
    // Inline the route's critical CSS into the initial document. This removes the
    // shared stylesheet from the first-paint dependency chain while retaining
    // cacheable stylesheet chunks for later navigations.
    inlineCss: true,
    // Tree-shake heavy barrel packages so a 2-icon import doesn't pull the whole library.
    // @fluentui/react-icons especially ships thousands of icons behind one barrel.
    optimizePackageImports: ["framer-motion", "@hugeicons/react", "@hugeicons/core-free-icons"],
  },
  async redirects() {
    return [
      // The old Portfolio and Rewards pages were folded into the dashboard, which is now the
      // only account entry point. Redirect the retired routes (and any old bookmarks) there at
      // the edge rather than dead-ending on a 404. Guarded by the portfolio-routing e2e smoke.
      { source: "/portfolio", destination: "/dashboard", permanent: true },
      { source: "/rewards", destination: "/dashboard", permanent: true },
    ]
  },
  async rewrites() {
    return [
      // SIWE → JWT bridge: Convex fetches the OIDC discovery doc + JWKS at these
      // well-known paths to verify the sandbox JWTs. Served by /api route handlers.
      { source: "/.well-known/openid-configuration", destination: "/api/siwe/openid-configuration" },
      { source: "/.well-known/jwks.json", destination: "/api/siwe/jwks" },
    ]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ]
  },
  distDir: process.env.AVANA_NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cryptologos.cc" },
      { protocol: "https", hostname: "token-logos.family.co" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "cdn.prod.website-files.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
}

export default withBundleAnalyzer(nextConfig)
