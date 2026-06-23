import "./globals.css"
import type { Metadata } from "next"
import localFont from "next/font/local"
import type React from "react"
import { Suspense } from "react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { ThemeProvider } from "./components/theme-provider"
import { DisplayPreferencesProvider } from "./components/display-preferences"
import { AvanaSessionProviders } from "./components/avana-session-providers"
import { PageLoadingBar } from "./components/page-loading-bar"
import { DeferredGlobalChrome } from "./components/deferred-global-chrome"
import { ConditionalSiteChrome } from "./components/conditional-site-chrome"

const diatypeSans = localFont({
  src: [
    {
      path: "../public/fonts/diatype/core/ABCDiatypeVariable-Trial.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-diatype-sans",
  display: "swap",
  preload: true,
})

const themeBootstrapScript = `(()=>{const storageKey="avana-theme";const root=document.documentElement;const storedTheme=window.localStorage.getItem(storageKey);const theme=storedTheme==="light"||storedTheme==="dark"||storedTheme==="system"?storedTheme:"system";const systemTheme=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";const resolvedTheme=theme==="system"?systemTheme:theme;root.classList.toggle("dark",resolvedTheme==="dark");root.style.colorScheme=resolvedTheme})()`

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
    images: [
      {
        url: "https://avana.cc/og?title=Avana&subtitle=Borrow+Against+LP+Positions+on+Aave+v4",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Avana - Borrow Against LP Positions",
    description: "Unlock liquidity from your LP tokens on Aave v4",
    images: ["https://avana.cc/og?title=Avana&subtitle=Borrow+Against+LP+Positions+on+Aave+v4"],
  },
  icons: {
    icon: [
      {
        url: "/avana-icon.svg",
      },
    ],
    shortcut: [
      {
        url: "/avana-icon.svg",
      },
    ],
  },
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={diatypeSans.variable}
      suppressHydrationWarning
    >
      <head>
        {/* Inline to avoid a render-blocking theme-bootstrap network request. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="min-h-screen bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DisplayPreferencesProvider>
            <AvanaSessionProviders>
              <ConditionalSiteChrome>
                <Suspense fallback={null}>
                  <PageLoadingBar />
                </Suspense>
                {children}
              </ConditionalSiteChrome>
              <DeferredGlobalChrome />
            </AvanaSessionProviders>
          </DisplayPreferencesProvider>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  )
}
