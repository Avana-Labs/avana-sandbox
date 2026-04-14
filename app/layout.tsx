import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import type React from "react"
import { Header } from "./components/header"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
    <html lang="en" className={`${inter.variable}`}>
      <head />
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="flex min-h-screen flex-col">
          <Header />
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  )
}
