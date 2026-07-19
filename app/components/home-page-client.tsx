"use client"

import dynamic from "next/dynamic"
import { HomeWorkspaceSkeleton } from "@/app/components/loading-states"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"

const HOME_WORKSPACE_WALLET_ID = "home-demo-wallet"
const HomePageWorkspaceRuntime = dynamic(
  () =>
    import("@/app/components/home-page-workspace-runtime").then((mod) => mod.HomePageWorkspaceRuntime),
  {
    ssr: false,
    loading: () => <HomeWorkspaceSkeleton />,
  },
)

export function HomePageClient() {
  const { isSignedIn } = useSiweAuth()
  // When signed in, the Express card reads the app-wide authed session (from the
  // layout providers) so it pre-loads the user's real pools — the same source the
  // dashboard uses. The signed-out public landing / CI render falls back to an
  // isolated demo wallet so the card still has something to show.
  if (isSignedIn) {
    return <HomePageWorkspaceRuntime />
  }
  return <HomePageWorkspaceRuntime walletId={HOME_WORKSPACE_WALLET_ID} />
}
