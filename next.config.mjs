import process from "node:process"

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

const connectSrc = [
  "'self'",
  "https:",
  "wss:", // Convex realtime in production (was missing — broke client subscriptions)
  ...(isDev ? ["ws:", "http:", "blob:"] : []),
  ...convexConnectOrigins(),
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
    key: "Permissions-Policy",
    value: "accelerometer=(), ambient-light-sensor=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), publickey-credentials-get=(), usb=()",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "sonner"],
  },
  async redirects() {
    return [
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
