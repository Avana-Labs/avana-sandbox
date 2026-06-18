import process from "node:process"

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
  async redirects() {
    return [
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
