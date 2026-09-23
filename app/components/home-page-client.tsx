"use client"

import dynamic from "next/dynamic"

// Keep the session/workspace graph out of the `/` entry chunk; the layout's product runtime
// provides the session (the signed-in wallet, or the empty guest wallet).
const HomePageWorkspaceRuntime = dynamic(() =>
  import("@/app/components/home-page-workspace-runtime").then((mod) => ({
    default: mod.HomePageWorkspaceRuntime,
  })),
)

export function HomePageClient() {
  return <HomePageWorkspaceRuntime />
}
