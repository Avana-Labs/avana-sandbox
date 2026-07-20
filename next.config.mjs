import process from "node:process"
import { URL } from "node:url"

const isDev = process.env.NODE_ENV === "development"

/**
 * Convex's reactive client connects over a WebSocket (https→wss, http→ws) and also
 * falls back to HTTP `/api/query`. The CSP `connect-src` MUST allow that backend
 * origin in BOTH transports or every client-side `useQuery`/`useMutation` (dashboard,
 * authed sessions, the shared liquidity ledger) is silently blocked and renders empty.
 * Derive the exact origins from the public Convex env so dev (http/ws on 127.0.0.1)
 * and prod (https/wss on *.convex.cloud) both work.
 */
function convexConnectOrigins() {
  const origins = new Set()
  for (const raw of [process.env.NEXT_PUBLIC_CONVEX_URL, process.env.NEXT_PUBLIC_CONVEX_SITE_URL]) {
    if (!raw) continue
    try {
      const u = new URL(raw)
      const wsProto = u.protocol === "https:" ? "wss:" : "ws:"
      origins.add(`${u.protocol}//${u.host}`)
      origins.add(`${wsProto}//${u.host}`)
    } catch {
      // ignore malformed env
    }
  }
  return [...origins]
}

// Explicit third-party origins the client actually connects to, instead of a
// blanket https:/wss: which would let a compromised bundle exfiltrate anywhere.
// Keep this in sync with the wallet stack:
//   - eth.merkle.io: the mainnet RPC wagmi's http() transport talks to.
//   - *.walletconnect.{com,org} + relay wss: WalletConnect relay / verify / echo /
//     pulse / explorer endpoints.
//   - api.web3modal.org + *.reown.com: ConnectKit/Reown wallet explorer API.
//   - *.coinbase.com (+ wss): Coinbase Smart Wallet keys/RPC. The legacy Coinbase
//     Wallet SDK analytics beacon (cca-lite.coinbase.com/metrics) is no longer
//     initialized on our pages — coinbaseWalletPreference is "smartWalletOnly".
// Vercel Analytics/Speed Insights beacon posts to same-origin /_vercel (covers 'self').
const thirdPartyConnectOrigins = [
  "https://eth.merkle.io",
  "https://*.walletconnect.com",
  "https://*.walletconnect.org",
  "wss://relay.walletconnect.com",
  "wss://relay.walletconnect.org",
  "https://api.web3modal.org",
  "https://*.reown.com",
  "https://*.coinbase.com",
  "wss://*.coinbase.com",
]

const connectSrc = [
  "'self'",
  ...convexConnectOrigins(),
  ...thirdPartyConnectOrigins,
  // Dev only: local Convex (http/ws on 127.0.0.1), the Next dev/HMR websocket, and
  // blob: workers. Production relies solely on the explicit origins above.
  ...(isDev ? ["ws:", "http:", "blob:"] : []),
].join(" ")

const contentSecurityPolicy = [
  "default-src 'self'",
  isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src ${connectSrc}`,
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // WalletConnect frames verify.walletconnect.{com,org} during connect — allow those.
  // We deliberately do NOT allow app.family.co: that third-party frame loads a Cloudflare
  // bot-challenge script costing ~3s of main-thread time on EVERY page (Lighthouse
  // bootup-time), and it is not needed for injected/MetaMask/Coinbase/WalletConnect
  // wallets. Blocking it is both faster and one fewer third-party frame.
  "frame-src 'self' https://verify.walletconnect.com https://verify.walletconnect.org",
  "frame-ancestors 'none'",
].join("; ")

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
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
    optimizePackageImports: ["framer-motion"],
  },
  async redirects() {
    return [
      // /express was a client-rendered page that only ever did redirect("/"). Serve the
      // same redirect at the edge instead — no React render, one fewer route in the bundle.
      { source: "/express", destination: "/", permanent: true },
      // The Rewards page was renamed to Portfolio and moved to /portfolio. Redirect the
      // old path (and any external referral links that point at /rewards) at the edge.
      { source: "/rewards", destination: "/portfolio", permanent: true },
      // The dashboard was removed; its accounts, activity, and quests all live on
      // the portfolio page now. Redirect old links/bookmarks instead of 404ing.
      { source: "/dashboard", destination: "/portfolio", permanent: true },
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

export default nextConfig
