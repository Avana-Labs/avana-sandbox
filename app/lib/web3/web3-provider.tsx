"use client"

import { useState, type ReactNode } from "react"
import { WagmiProvider, createConfig, http } from "wagmi"
import { injected } from "wagmi/connectors"
import { mainnet } from "wagmi/chains"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ConnectKitProvider, getDefaultConfig } from "connectkit"

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

const wagmiConfig = walletConnectProjectId
  ? createConfig(
      getDefaultConfig({
        appName: "Avana Sandbox",
        chains: [mainnet],
        transports: { [mainnet.id]: http() },
        walletConnectProjectId,
        // Hydrate wallet state on the client (no headers() read) so static generation
        // of the app's pages is preserved.
        ssr: true,
      }),
    )
  : createConfig({
      chains: [mainnet],
      connectors: [injected()],
      transports: { [mainnet.id]: http() },
      ssr: true,
    })

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    // reconnectOnMount={false}: this is a sandbox that runs on a built-in demo
    // wallet, so there is no real wallet session to restore on load. Letting wagmi
    // lazily reconnect to a connector on mount only produces EIP-1193 "provider
    // timeout / not connected" console noise (and a perceptible first-load delay)
    // when no extension is present. Connecting on demand via the header button
    // still works.
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider options={{ enforceSupportedChains: false }}>{children}</ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
