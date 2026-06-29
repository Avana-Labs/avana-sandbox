"use client"

import { useState, type ReactNode } from "react"
import { WagmiProvider, createConfig, http } from "wagmi"
import { mainnet } from "wagmi/chains"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ConnectKitProvider, getDefaultConfig } from "connectkit"

// ConnectKit requires a WalletConnect Cloud projectId. Set the real one in
// NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID for WalletConnect/mobile wallets; the
// placeholder keeps injected wallets (MetaMask) working locally.
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "avana-sandbox-placeholder"

const wagmiConfig = createConfig(
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

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider options={{ enforceSupportedChains: false }}>{children}</ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
