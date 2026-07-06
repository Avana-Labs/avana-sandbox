"use client"

import { useState, type ReactNode } from "react"
import { useTheme } from "@/app/components/theme-provider"
import { WagmiProvider, createConfig, http } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ConnectKitProvider, SIWEProvider, getDefaultConfig } from "connectkit"
import { siweConfig } from "@/app/lib/siwe/connectkit-siwe"
import { AVANA_EXTERNAL_LINKS } from "@/app/components/external-links"
import { IS_DEV_SHORTCUT_MODE } from "@/app/lib/test-mode"
import { TARGET_CHAIN } from "@/app/lib/web3/target-chain"

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? ""
// The headless QA harness seeds a SIWE token without a live wagmi connection, so the
// SIWE provider must not auto-sign-out on "disconnect" in that mode.

// WalletConnect logs a warning (and silently overrides metadata.url) whenever the
// configured URL differs from the actual page origin. Deriving it from the runtime
// origin keeps local/preview/prod each matching their own page. This module is
// client-only ("use client"), but createConfig also runs during SSR/prerender where
// window is undefined — fall back to the canonical production origin there.
export function resolveAppOrigin() {
  if (typeof window !== "undefined") return window.location.origin
  return "https://avana.cc"
}

const appOrigin = resolveAppOrigin()

/**
 * ConnectKit's recommended config (Family getDefaultConfig). It wires WalletConnect via
 * the project id, registers the mainstream wallets, and — with coinbaseWalletPreference
 * "smartWalletOnly" — offers the Coinbase Smart Wallet without pulling in the legacy
 * Coinbase Wallet SDK, whose analytics beacon (cca-lite.coinbase.com/metrics) otherwise
 * fires on every navigation even for users who never pick Coinbase. The Aave Account
 * connector (which preloads an app.family.co iframe) is opt-in and left off.
 */
const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: "Avana",
    appDescription: "Practice DeFi borrowing, lending, and looping in a live sandbox.",
    appUrl: appOrigin,
    appIcon: `${appOrigin}/avana-icon.png`,
    walletConnectProjectId,
    coinbaseWalletPreference: "smartWalletOnly",
    chains: [TARGET_CHAIN],
    transports: { [TARGET_CHAIN.id]: http() },
    // Hydrate wallet state on the client so static generation is preserved.
    ssr: true,
    // The @aave/account connector eagerly calls AaveAccountSdk.connect(), which throws
    // "EIP1193 provider connection timeout" and stalls the ConnectKit transition when no
    // Aave wallet is present. We don't need it — the mainstream wallets + WalletConnect
    // (which covers hundreds of wallets) are enough. Keep EIP-6963 discovery enabled:
    // desktop extensions announce their injected providers through it, and disabling it
    // makes ConnectKit fall back to WalletConnect QR/deep-link flows.
    enableAaveAccount: false,
    multiInjectedProviderDiscovery: true,
  }),
)

/**
 * Keep the wallet overlay compositor-cheap. ConnectKit 1.9.x still animates the modal with
 * older framer-motion transitions, and any live backdrop blur behind those transitions causes
 * visible ghosting / frame drops while switching wallet screens.
 */
const connectKitTheme = {
  "--ck-overlay-background": "rgba(7, 9, 12, 0.72)",
  "--ck-overlay-backdrop-filter": "none",
} as const

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  // Mirror the app's resolved theme (from our custom ThemeProvider — next-themes is NOT
  // mounted) so the wallet modal matches the in-app light/dark toggle instead of ConnectKit's
  // OS-following default. resolvedTheme is always "light" | "dark".
  const { resolvedTheme } = useTheme()
  const connectKit = (
    <ConnectKitProvider
      mode={resolvedTheme}
      customTheme={connectKitTheme}
      options={{
        enforceSupportedChains: false,
        reducedMotion: true,
        overlayBlur: 0,
        // The root already reserves a stable scrollbar gutter. ConnectKit's default
        // body padding adds a second scrollbar-width compensation and shifts the entire
        // page horizontally whenever the wallet modal opens.
        avoidLayoutShift: false,
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
  )

  return (
    // No reconnectOnMount override: wagmi restores the wallet session on reload, so a
    // connected/signed-in wallet survives a refresh instead of appearing signed out.
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {IS_DEV_SHORTCUT_MODE ? (
          connectKit
        ) : (
          <SIWEProvider {...siweConfig} signOutOnDisconnect signOutOnAccountChange>
            {connectKit}
          </SIWEProvider>
        )}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
