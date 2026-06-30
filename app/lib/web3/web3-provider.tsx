"use client"

import { useState, type ReactNode } from "react"
import { WagmiProvider, createConfig, http } from "wagmi"
import { coinbaseWallet, injected, metaMask, walletConnect } from "wagmi/connectors"
import { mainnet } from "wagmi/chains"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ConnectKitProvider } from "connectkit"
import { AVANA_EXTERNAL_LINKS } from "@/app/components/external-links"

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

// Register connectors EXPLICITLY rather than via ConnectKit's getDefaultConfig. The
// default config bundles the "@aave/account" connector, which eagerly preloads an
// app.family.co iframe that (a) runs a ~3s Cloudflare bot-challenge script on every page
// (killed Lighthouse) and (b) logs CSP/connection console errors that fail the e2e audit.
// We only need the mainstream wallets; this keeps the Connect modal clean, the console
// silent, and first load fast. `multiInjectedProviderDiscovery: false` also stops wagmi
// from auto-attaching announced EIP-6963 providers (e.g. Aave Account) we didn't register.
const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [
    injected(),
    metaMask(),
    coinbaseWallet({ appName: "Avana Sandbox" }),
    ...(walletConnectProjectId
      ? [walletConnect({ projectId: walletConnectProjectId, showQrModal: false })]
      : []),
  ],
  transports: { [mainnet.id]: http() },
  multiInjectedProviderDiscovery: false,
  // Hydrate wallet state on the client (no headers() read) so static generation is preserved.
  ssr: true,
})

/**
 * Keep ConnectKit's native theme/colors. We only add a glass-blur backdrop so the
 * Connect Wallet modal matches the blurred overlay used by the app's other popups.
 */
const connectKitTheme = {
  "--ck-overlay-backdrop-filter": "blur(20px)",
} as const

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
        <ConnectKitProvider
          customTheme={connectKitTheme}
          options={{
            enforceSupportedChains: false,
            disclaimer: (
              <>
                By connecting your wallet you agree to the{" "}
                <a href={AVANA_EXTERNAL_LINKS.terms} target="_blank" rel="noreferrer">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href={AVANA_EXTERNAL_LINKS.privacy} target="_blank" rel="noreferrer">
                  Privacy Policy
                </a>
              </>
            ),
          }}
        >
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
