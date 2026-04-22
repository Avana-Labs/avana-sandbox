import "./globals.css"
import type { Metadata } from "next"
import localFont from "next/font/local"
import type React from "react"
import { Header } from "./components/header"
import { Toaster } from "sonner"
import { ThemeProvider } from "./components/theme-provider"

const diatypeSans = localFont({
  src: [
    {
      path: "../public/fonts/diatype/core/ABCDiatype-Regular-Trial.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/diatype/core/ABCDiatype-Medium-Trial.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/diatype/core/ABCDiatypeVariable-Trial.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/diatype/core/ABCDiatype-Bold-Trial.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-diatype-sans",
  display: "swap",
})

const diatypeData = localFont({
  src: [
    {
      path: "../public/fonts/diatype/data/ABCDiatypeSemi-MonoVariable-Trial.woff2",
      weight: "400 700",
      style: "normal",
    },
  ],
  variable: "--font-diatype-data",
  display: "swap",
})

const diatypeBrand = localFont({
  src: [
    {
      path: "../public/fonts/diatype/brand/ABCDiatypeExtended-Medium-Trial.woff2",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-diatype-brand",
  display: "swap",
})

const outfitFallback = localFont({
  src: [
    {
      path: "../public/fonts/outfit/Outfit-VariableFont_wght.ttf",
      weight: "400 700",
      style: "normal",
    },
  ],
  variable: "--font-outfit",
  display: "swap",
})

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
        url: "/icon.svg",
      },
    ],
    shortcut: [
      {
        url: "/icon.svg",
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
      className={`${diatypeSans.variable} ${diatypeData.variable} ${diatypeBrand.variable} ${outfitFallback.variable}`}
      suppressHydrationWarning
    >
      <head />
      <body className="min-h-screen bg-background font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex min-h-screen flex-col">
            <Header />
            <div className="flex-1">{children}</div>
            <Toaster />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
