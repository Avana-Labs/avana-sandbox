"use client"

import Link from "next/link"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

type RewardRow = {
  label: string
  value: string
}

type Tile = {
  href: string
  logoSrc: string
  kind: "Lend" | "Loop" | "Borrow" | "Coming Soon"
  title: string
  tvl: string
  apyLabel: string
  apy: string
  rewardRows?: RewardRow[]
  waitlistHref?: string
}

const TILES: Tile[] = [
  {
    href: "/vault/usx_rwa",
    logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    kind: "Lend",
    title: "USX RWA",
    tvl: "$2.019M",
    apyLabel: "APY",
    apy: "5.28%",
    rewardRows: [
      { label: "Protocol Points", value: "5.0x" },
      { label: "Loopscale Points", value: "3.0x" },
    ],
  },
  {
    href: "/vault/usx_one",
    logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    kind: "Lend",
    title: "USX ONE",
    tvl: "$8.110M",
    apyLabel: "APY",
    apy: "1.59%",
    rewardRows: [
      { label: "Protocol Points", value: "5.0x" },
      { label: "Loopscale Points", value: "3.0x" },
    ],
  },
  {
    href: "/vault/3gcVWr7Bgpp2EmbuF1VjjW6djHBik1d3vqjZLw2po6os",
    logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/oro-logo.jpg",
    kind: "Lend",
    title: "USDC Frontier",
    tvl: "$94.00K",
    apyLabel: "APY",
    apy: "4.57%",
    rewardRows: [
      { label: "Protocol Points", value: "1.0x" },
      { label: "Loopscale Points", value: "3.0x" },
    ],
  },
  {
    href: "/vault/collector_vault",
    logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/collector-crypto-logo-two.png",
    kind: "Coming Soon",
    title: "Collector Vault",
    tvl: "",
    apyLabel: "",
    apy: "",
    waitlistHref: "https://forms.gle/mxRQa5jWxJ1LD4zt7",
  },
  {
    href: "/vault/7n5F6vLutwTPuVju9t4ZC22vHyJNyGbHKzaokdyWycjy",
    logoSrc: "https://bridgesplit-app.s3.amazonaws.com/organizations/fragmetric-logo.png",
    kind: "Lend",
    title: "Fragmetric SOL",
    tvl: "$193.6K",
    apyLabel: "APY",
    apy: "5.91%",
    rewardRows: [{ label: "Protocol Points", value: "3.0x" }],
  },
  {
    href: "/vault/xsol_one",
    logoSrc: "https://bridgesplit-app.s3.amazonaws.com/logo/hylo.png",
    kind: "Lend",
    title: "xSOL ONE",
    tvl: "$320.6K",
    apyLabel: "APY",
    apy: "0.23%",
    rewardRows: [
      { label: "Protocol Points", value: "25.0x" },
      { label: "Loopscale Points", value: "3.0x" },
    ],
  },
  {
    href: "/vault/hyusd_one",
    logoSrc: "https://bridgesplit-app.s3.amazonaws.com/logo/hylo.png",
    kind: "Lend",
    title: "hyUSD ONE",
    tvl: "$141.7K",
    apyLabel: "APY",
    apy: "-35.39%",
    rewardRows: [
      { label: "Protocol Points", value: "8.0x" },
      { label: "Loopscale Points", value: "3.0x" },
    ],
  },
  {
    href: "/vault/7PeYxZpM2dpc4RRDQovexMJ6tkSVLWtRN4mbNywsU3e6",
    logoSrc: "https://bridgesplit-app.s3.amazonaws.com/logo/onre_general.jpeg",
    kind: "Lend",
    title: "USDC OnRe",
    tvl: "$498.8K",
    apyLabel: "APY",
    apy: "6.23%",
    rewardRows: [
      { label: "Protocol Points", value: "8.0x" },
      { label: "Loopscale Points", value: "3.0x" },
    ],
  },
  {
    href: "/loops/onyc-usx",
    logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    kind: "Loop",
    title: "ONyc/USX",
    tvl: "$1.703M",
    apyLabel: "Avg. APY",
    apy: "19.93%",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/onyc-usx",
    logoSrc: "https://bridgesplit-app.s3.amazonaws.com/logo/onre_general.jpeg",
    kind: "Loop",
    title: "ONyc/USX",
    tvl: "$352.6K",
    apyLabel: "Avg. APY",
    apy: "8.89%",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/syrupusdc-usx",
    logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    kind: "Loop",
    title: "syrupUSDC/USX",
    tvl: "$10.21K",
    apyLabel: "Avg. APY",
    apy: "-53.30%",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/eusx-usx",
    logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    kind: "Loop",
    title: "eUSX/USX",
    tvl: "$498.8K",
    apyLabel: "Avg. APY",
    apy: "6.23%",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/shyusd-hyusd",
    logoSrc: "https://bridgesplit-app.s3.amazonaws.com/logo/hylo.png",
    kind: "Loop",
    title: "sHYUSD/hyUSD",
    tvl: "$1,566.33",
    apyLabel: "Avg. APY",
    apy: "-52.11%",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/xsol-sol",
    logoSrc: "https://bridgesplit-app.s3.amazonaws.com/logo/hylo.png",
    kind: "Loop",
    title: "xSOL/SOL",
    tvl: "$1.397M",
    apyLabel: "Avg. APY",
    apy: "17.81%",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/onyc-usdt",
    logoSrc: "https://bridgesplit-app.s3.amazonaws.com/logo/onre_general.jpeg",
    kind: "Loop",
    title: "ONyc/USDT",
    tvl: "$1.607M",
    apyLabel: "Avg. APY",
    apy: "6.34%",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/hylosol-sol",
    logoSrc: "https://bridgesplit-app.s3.amazonaws.com/logo/hylo.png",
    kind: "Loop",
    title: "hyloSOL/SOL",
    tvl: "$623.8K",
    apyLabel: "Avg. APY",
    apy: "17.63%",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/eusx-16sep26-usx",
    logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    kind: "Loop",
    title: "PT-eUSX-16SEP26/USX",
    tvl: "$18.55K",
    apyLabel: "Avg. APY",
    apy: "13.36%",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/pst-usx",
    logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    kind: "Loop",
    title: "PST/USX",
    tvl: "$29.36M",
    apyLabel: "Avg. APY",
    apy: "20.55%",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/onyc-usdc",
    logoSrc: "https://bridgesplit-app.s3.amazonaws.com/logo/onre_general.jpeg",
    kind: "Loop",
    title: "ONyc/USDC",
    tvl: "$141.7K",
    apyLabel: "Avg. APY",
    apy: "-35.39%",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/bulksol-sol",
    logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/logo/bulk.png",
    kind: "Loop",
    title: "BulkSOL/SOL",
    tvl: "$1.083M",
    apyLabel: "Avg. APY",
    apy: "8.80%",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/shyusd-usdc",
    logoSrc: "https://bridgesplit-app.s3.amazonaws.com/logo/hylo.png",
    kind: "Loop",
    title: "sHYUSD/USDC",
    tvl: "$180.08",
    apyLabel: "Avg. APY",
    apy: "-26.72%",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/eusx-usdc",
    logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    kind: "Loop",
    title: "eUSX/USDC",
    tvl: "$569.0K",
    apyLabel: "Avg. APY",
    apy: "13.74%",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/prime-usx",
    logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    kind: "Loop",
    title: "PRIME/USX",
    tvl: "$6.998M",
    apyLabel: "Avg. APY",
    apy: "21.85%",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/usx-16sep26-usx",
    logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    kind: "Loop",
    title: "PT-USX-16SEP26/USX",
    tvl: "$6.998M",
    apyLabel: "Avg. APY",
    apy: "21.85%",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/market/USX?role=borrow",
    logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    kind: "Borrow",
    title: "USX",
    tvl: "",
    apyLabel: "APY",
    apy: "",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
]

export function MultiplyLendSection() {
  return (
    <section className="mt-8 space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">Lend</h2>
      </div>

      <div className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-3">
          {TILES.map((tile) => (
            <LendTileCard key={tile.title + tile.href} tile={tile} />
          ))}
        </div>
      </div>
    </section>
  )
}

function LendTileCard({ tile }: { tile: Tile }) {
  const inner = (
    <div className="group flex h-full w-[18.5rem] flex-col overflow-hidden rounded-radius-md border border-border bg-surface-raised p-3.5 shadow-elev-1 transition-all hover:border-border hover:bg-surface-inset hover:shadow-elev-2">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tile.logoSrc} alt="" aria-hidden="true" className="h-full w-full object-cover" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full border border-border bg-surface-inset px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
              {tile.kind}
            </span>
          </div>

          <h3 className="mt-2 truncate text-[15px] font-medium tracking-tight text-foreground">{tile.title}</h3>
        </div>
      </div>

      {tile.kind === "Coming Soon" ? (
        <div className="mt-4 flex flex-1 flex-col justify-between">
          <div className="space-y-3">
            <div className="rounded-radius-sm border border-border bg-background px-3 py-2">
              <div className="text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">Coming Soon</div>
              <div className="mt-1 text-[13px] font-medium text-foreground">Join waitlist</div>
            </div>
          </div>

          <a
            href={tile.waitlistHref}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex h-9 items-center justify-center rounded-radius-sm bg-accent-primary px-3 text-[13px] font-medium text-accent-primary-foreground shadow-elev-1 transition-colors hover:bg-accent-primary-hover"
          >
            Join waitlist
          </a>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-radius-sm border border-border bg-background px-3 py-2">
              <div className="text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">Loopscale TVL</div>
              <div className="mt-1 font-data text-[15px] font-medium tabular-nums text-foreground">{tile.tvl}</div>
            </div>
            <div className="rounded-radius-sm border border-border bg-background px-3 py-2">
              <div className="text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">{tile.apyLabel}</div>
              <div className="mt-1 font-data text-[15px] font-medium tabular-nums text-foreground">{tile.apy}</div>
            </div>
          </div>

          <Accordion type="single" collapsible className="mt-3 w-full">
            <AccordionItem value="rewards" className="border-b-0">
              <AccordionTrigger className="py-2 text-[13px] font-medium text-foreground hover:no-underline">
                Rewards
              </AccordionTrigger>
              <AccordionContent className="pb-0 pt-0">
                <div className="space-y-2 rounded-radius-sm border border-border bg-background px-3 py-3">
                  <div className="text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">Token Rewards</div>
                  {tile.rewardRows?.length ? (
                    <div className="space-y-1.5">
                      {tile.rewardRows.map((row) => (
                        <div key={row.label} className="flex items-center justify-between gap-3 text-[12.5px]">
                          <span className="text-muted-foreground">{row.label}</span>
                          <span className="font-data tabular-nums text-foreground">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[12.5px] text-muted-foreground">No active rewards</div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </>
      )}
    </div>
  )

  if (tile.kind === "Coming Soon") {
    return <div className="shrink-0">{inner}</div>
  }

  return (
    <Link href={tile.href} prefetch aria-label={`Open ${tile.title}`} className="shrink-0">
      {inner}
    </Link>
  )
}
