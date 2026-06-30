"use client"

import { useState, type ReactNode } from "react"
import { WagmiProvider, createConfig, http } from "wagmi"
import { mainnet } from "wagmi/chains"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ConnectKitProvider, SIWEProvider, getDefaultConfig } from "connectkit"
import { siweConfig } from "@/app/lib/siwe/connectkit-siwe"
import { AVANA_EXTERNAL_LINKS } from "@/app/components/external-links"

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? ""
// The headless QA harness seeds a SIWE token without a live wagmi connection, so the
// SIWE provider must not auto-sign-out on "disconnect" in that mode.
const isTestMode = process.env.NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE === "1"

/**
 * ConnectKit's recommended config (Family getDefaultConfig). It wires WalletConnect via
 * the project id, registers the mainstream wallets, and — with coinbaseWalletPreference
 * "all" — lets users connect either a standard EOA or a Coinbase Smart Wallet. The Aave
 * Account connector (which preloads an app.family.co iframe) is opt-in and left off.
 */
const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: "Avana",
    appDescription: "Practice DeFi borrowing, lending, and looping in a live sandbox.",
    appUrl: "https://avana-webapp.vercel.app",
    appIcon: "https://avana-webapp.vercel.app/avana-icon.svg",
    walletConnectProjectId,
    coinbaseWalletPreference: "all",
    chains: [mainnet],
    transports: { [mainnet.id]: http() },
    // Hydrate wallet state on the client so static generation is preserved.
    ssr: true,
    // The @aave/account connector eagerly calls AaveAccountSdk.connect(), which throws
    // "EIP1193 provider connection timeout" and stalls the ConnectKit transition when no
    // Aave wallet is present. We don't need it — the mainstream wallets + WalletConnect
    // (which covers hundreds of wallets) are enough. Disabling EIP-6963 auto-discovery
    // stops the same provider being re-attached and announced.
    enableAaveAccount: false,
    multiInjectedProviderDiscovery: false,
  }),
)

/** Keep ConnectKit's native theme; only add a glass-blur backdrop to match the app. */
const connectKitTheme = {
  "--ck-overlay-backdrop-filter": "blur(20px)",
} as const

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    // No reconnectOnMount override: wagmi restores the wallet session on reload, so a
    // connected/signed-in wallet survives a refresh instead of appearing signed out.
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <SIWEProvider {...siweConfig} signOutOnDisconnect={!isTestMode} signOutOnAccountChange>
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
        </SIWEProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
