"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type RewardRow = {
  label: string
  value: string
}

export type LendRow = {
  href: string
  protocol: string
  protocolLogo: string
  asset: string
  kind: "Lend" | "Loop" | "Borrow"
  apy: string
  apyLabel: "APY" | "Avg. APY"
  partnerRewards?: string
  points?: string
  rewardRows?: RewardRow[]
  waitlistHref?: string
}

export const LEND_ROWS: LendRow[] = [
  {
    href: "/vault/usx_rwa",
    protocol: "Solstice",
    protocolLogo: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    asset: "USX RWA",
    kind: "Lend",
    apy: "5.28%",
    apyLabel: "APY",
    points: "3.0x",
    rewardRows: [
      { label: "Protocol Points", value: "5.0x" },
      { label: "Loopscale Points", value: "3.0x" },
    ],
  },
  {
    href: "/vault/usx_one",
    protocol: "Solstice",
    protocolLogo: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    asset: "USX ONE",
    kind: "Lend",
    apy: "1.59%",
    apyLabel: "APY",
    points: "3.0x",
    rewardRows: [
      { label: "Protocol Points", value: "5.0x" },
      { label: "Loopscale Points", value: "3.0x" },
    ],
  },
  {
    href: "/vault/3gcVWr7Bgpp2EmbuF1VjjW6djHBik1d3vqjZLw2po6os",
    protocol: "Oro",
    protocolLogo: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/oro-logo.jpg",
    asset: "USDC Frontier",
    kind: "Lend",
    apy: "4.57%",
    apyLabel: "APY",
    points: "3.0x",
    rewardRows: [
      { label: "Protocol Points", value: "1.0x" },
      { label: "Loopscale Points", value: "3.0x" },
    ],
  },
  {
    href: "/vault/collector_vault",
    protocol: "Collector Crypt",
    protocolLogo: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/collector-crypto-logo-two.png",
    asset: "Collector Vault",
    kind: "Lend",
    apy: "",
    apyLabel: "APY",
    waitlistHref: "https://forms.gle/mxRQa5jWxJ1LD4zt7",
  },
  {
    href: "/vault/7n5F6vLutwTPuVju9t4ZC22vHyJNyGbHKzaokdyWycjy",
    protocol: "Fragmetric",
    protocolLogo: "https://bridgesplit-app.s3.amazonaws.com/organizations/fragmetric-logo.png",
    asset: "Fragmetric SOL",
    kind: "Lend",
    apy: "5.91%",
    apyLabel: "APY",
    points: "3.0x",
    rewardRows: [{ label: "Protocol Points", value: "3.0x" }],
  },
  {
    href: "/vault/xsol_one",
    protocol: "Hylo",
    protocolLogo: "https://bridgesplit-app.s3.amazonaws.com/logo/hylo.png",
    asset: "xSOL ONE",
    kind: "Lend",
    apy: "0.23%",
    apyLabel: "APY",
    points: "3.0x",
    rewardRows: [
      { label: "Protocol Points", value: "25.0x" },
      { label: "Loopscale Points", value: "3.0x" },
    ],
  },
  {
    href: "/vault/hyusd_one",
    protocol: "Hylo",
    protocolLogo: "https://bridgesplit-app.s3.amazonaws.com/logo/hylo.png",
    asset: "hyUSD ONE",
    kind: "Lend",
    apy: "-35.39%",
    apyLabel: "APY",
    points: "3.0x",
    rewardRows: [
      { label: "Protocol Points", value: "8.0x" },
      { label: "Loopscale Points", value: "3.0x" },
    ],
  },
  {
    href: "/vault/7PeYxZpM2dpc4RRDQovexMJ6tkSVLWtRN4mbNywsU3e6",
    protocol: "OnRe",
    protocolLogo: "https://bridgesplit-app.s3.amazonaws.com/logo/onre_general.jpeg",
    asset: "USDC OnRe",
    kind: "Lend",
    apy: "6.23%",
    apyLabel: "APY",
    points: "3.0x",
    rewardRows: [
      { label: "Protocol Points", value: "8.0x" },
      { label: "Loopscale Points", value: "3.0x" },
    ],
  },
  {
    href: "/loops/onyc-usx",
    protocol: "Solstice",
    protocolLogo: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    asset: "ONyc/USX",
    kind: "Loop",
    apy: "19.93%",
    apyLabel: "Avg. APY",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/onyc-usx",
    protocol: "OnRe",
    protocolLogo: "https://bridgesplit-app.s3.amazonaws.com/logo/onre_general.jpeg",
    asset: "ONyc/USX",
    kind: "Loop",
    apy: "8.89%",
    apyLabel: "Avg. APY",
    points: "8.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/syrupusdc-usx",
    protocol: "Solstice",
    protocolLogo: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    asset: "syrupUSDC/USX",
    kind: "Loop",
    apy: "-53.30%",
    apyLabel: "Avg. APY",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/eusx-usx",
    protocol: "Solstice",
    protocolLogo: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    asset: "eUSX/USX",
    kind: "Loop",
    apy: "6.23%",
    apyLabel: "Avg. APY",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/shyusd-hyusd",
    protocol: "Hylo",
    protocolLogo: "https://bridgesplit-app.s3.amazonaws.com/logo/hylo.png",
    asset: "sHYUSD/hyUSD",
    kind: "Loop",
    apy: "-52.11%",
    apyLabel: "Avg. APY",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/xsol-sol",
    protocol: "Hylo",
    protocolLogo: "https://bridgesplit-app.s3.amazonaws.com/logo/hylo.png",
    asset: "xSOL/SOL",
    kind: "Loop",
    apy: "17.81%",
    apyLabel: "Avg. APY",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/onyc-usdt",
    protocol: "OnRe",
    protocolLogo: "https://bridgesplit-app.s3.amazonaws.com/logo/onre_general.jpeg",
    asset: "ONyc/USDT",
    kind: "Loop",
    apy: "6.34%",
    apyLabel: "Avg. APY",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/hylosol-sol",
    protocol: "Hylo",
    protocolLogo: "https://bridgesplit-app.s3.amazonaws.com/logo/hylo.png",
    asset: "hyloSOL/SOL",
    kind: "Loop",
    apy: "17.63%",
    apyLabel: "Avg. APY",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/eusx-16sep26-usx",
    protocol: "Solstice",
    protocolLogo: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    asset: "PT-eUSX-16SEP26/USX",
    kind: "Loop",
    apy: "13.36%",
    apyLabel: "Avg. APY",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/pst-usx",
    protocol: "Solstice",
    protocolLogo: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    asset: "PST/USX",
    kind: "Loop",
    apy: "20.55%",
    apyLabel: "Avg. APY",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/onyc-usdc",
    protocol: "OnRe",
    protocolLogo: "https://bridgesplit-app.s3.amazonaws.com/logo/onre_general.jpeg",
    asset: "ONyc/USDC",
    kind: "Loop",
    apy: "-35.39%",
    apyLabel: "Avg. APY",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/bulksol-sol",
    protocol: "Bulk",
    protocolLogo: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/logo/bulk.png",
    asset: "BulkSOL/SOL",
    kind: "Loop",
    apy: "8.80%",
    apyLabel: "Avg. APY",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/shyusd-usdc",
    protocol: "Hylo",
    protocolLogo: "https://bridgesplit-app.s3.amazonaws.com/logo/hylo.png",
    asset: "sHYUSD/USDC",
    kind: "Loop",
    apy: "-26.72%",
    apyLabel: "Avg. APY",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/eusx-usdc",
    protocol: "Solstice",
    protocolLogo: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    asset: "eUSX/USDC",
    kind: "Loop",
    apy: "13.74%",
    apyLabel: "Avg. APY",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/prime-usx",
    protocol: "Solstice",
    protocolLogo: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    asset: "PRIME/USX",
    kind: "Loop",
    apy: "21.85%",
    apyLabel: "Avg. APY",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/usx-16sep26-usx",
    protocol: "Solstice",
    protocolLogo: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    asset: "PT-USX-16SEP26/USX",
    kind: "Loop",
    apy: "21.85%",
    apyLabel: "Avg. APY",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
]

export const PAGE_SIZE = 12

export function MultiplyLendSection() {
  const [page, setPage] = React.useState(0)
  const pageCount = Math.max(1, Math.ceil(LEND_ROWS.length / PAGE_SIZE))
  const visibleRows = LEND_ROWS.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  return (
    <section className="mt-1 space-y-4">
      <InlineTableSection
        title="Lend"
        rows={visibleRows}
        pagination={
          <div className="flex items-center justify-end gap-3 border-t border-border px-3 py-2.5">
            <span className="text-[12px] text-muted-foreground">
              {page + 1} of {pageCount}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Previous page"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Next page"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />
    </section>
  )
}

function InlineTableSection({ rows, pagination }: { title: string; rows: LendRow[]; pagination?: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div />

      <div className="overflow-hidden rounded-radius-md border border-border bg-surface-raised shadow-elev-1">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pt-3 pl-5 text-[10.5px] font-medium uppercase tracking-[0.06em]">Protocol</th>
                <th className="pb-2 pt-3 pl-4 text-left text-[10.5px] font-medium uppercase tracking-[0.06em]">Asset</th>
                <th className="pb-2 pt-3 pl-4 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">APY</th>
                <th className="pb-2 pt-3 pl-4 text-left text-[10.5px] font-medium uppercase tracking-[0.06em]">Partner Rewards</th>
                <th className="pb-2 pt-3 pl-4 pr-5 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, index) => (
                <tr key={`${row.kind}-${row.protocol}-${row.asset}-${row.href}-${index}`} className="transition-colors hover:bg-surface-inset/60">
                  <td className="py-2.5 pl-5">
                    <CellLink href={row.href} className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={row.protocolLogo}
                        alt=""
                        aria-hidden="true"
                        className="size-9 shrink-0 rounded-full bg-card object-cover ring-2 ring-background"
                      />
                      <span className="min-w-0">
                        <span className="block text-[14px] font-medium leading-tight text-foreground">{row.protocol}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{row.kind}</span>
                      </span>
                    </CellLink>
                  </td>
                  <td className="py-2.5 pl-4">
                    <CellLink href={row.href} className="min-w-0">
                      <span className="block text-[14px] font-medium leading-tight text-foreground">{row.asset}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">{row.apyLabel}</span>
                    </CellLink>
                  </td>
                  <td className="py-2.5 pl-4 text-right">
                    <CellLink
                      href={row.href}
                      className={cn(
                        "font-data text-[13px] font-medium tabular-nums",
                        row.apy ? (row.apy.startsWith("-") ? "text-rose-600" : "text-emerald-600") : "text-muted-foreground",
                      )}
                    >
                      {row.apy || "—"}
                    </CellLink>
                  </td>
                  <td className="py-2.5 pl-4">
                    <CellLink href={row.href} className="text-foreground">
                      {row.rewardRows?.[1] ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-muted-foreground">{row.rewardRows[1].label}</span>
                          <span className="font-data tabular-nums text-foreground">{row.rewardRows[1].value}</span>
                        </span>
                      ) : row.rewardRows?.[0] ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-muted-foreground">{row.rewardRows[0].label}</span>
                          <span className="font-data tabular-nums text-foreground">{row.rewardRows[0].value}</span>
                        </span>
                      ) : row.partnerRewards ? (
                        row.partnerRewards
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </CellLink>
                  </td>
                  <td className="py-2.5 pl-4 pr-5 text-right">
                    {row.waitlistHref ? (
                      <div className="inline-flex items-center">
                        <Button asChild size="sm" className="h-7 rounded-xs px-2.5 text-[12px]">
                          <a href={row.waitlistHref} target="_blank" rel="noreferrer">
                            Join waitlist
                          </a>
                        </Button>
                      </div>
                    ) : (
                      <CellLink href={row.href} className="inline-flex items-center justify-end gap-1 font-medium text-foreground">
                        <Star className="h-3 w-3" />
                        <span>{row.points ?? "—"}</span>
                      </CellLink>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pagination}
    </div>
  )
}

function CellLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn("block text-left", className)}>
      {children}
    </Link>
  )
}
