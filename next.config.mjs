import process from "node:process"

/** @type {import('next').NextConfig} */
const nextConfig = {
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
  turbopack: {},
}

export default nextConfig
