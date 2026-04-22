import process from "node:process"

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/incentivize", destination: "/stake", permanent: true },
      { source: "/simulate", destination: "/stake", permanent: true },
      { source: "/explore", destination: "/borrow", permanent: true },
      { source: "/leverage", destination: "/perps", permanent: true },
      { source: "/rewards-hub", destination: "/rewards", permanent: true },
      { source: "/invest", destination: "/lend", permanent: true },
    ]
  },
  distDir: process.env.AVANA_NEXT_DIST_DIR || ".next",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cryptologos.cc" },
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
