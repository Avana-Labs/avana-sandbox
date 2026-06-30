"use client"

import { useState, type ReactNode } from "react"
import { WagmiProvider, createConfig, http } from "wagmi"
import { coinbaseWallet, injected, metaMask } from "wagmi/connectors"
import { mainnet } from "wagmi/chains"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ConnectKitProvider, getDefaultConfig } from "connectkit"
import { AVANA_EXTERNAL_LINKS } from "@/app/components/external-links"

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
  : // No WalletConnect project id → register the popular wallets explicitly so the
    // Connect modal lists MetaMask / Coinbase / Browser wallet (not just one generic
    // "Browser Wallet"). Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to additionally light
    // up the full WalletConnect wallet list (Phantom, Rainbow, "More Available", …).
    createConfig({
      chains: [mainnet],
      connectors: [
        injected(),
        metaMask(),
        coinbaseWallet({ appName: "Avana Sandbox" }),
      ],
      transports: { [mainnet.id]: http() },
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
