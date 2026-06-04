"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type RewardRow = {
  label: string
  value: string
}

type LendRow = {
  href: string
  protocol: string
  protocolLogo: string
  asset: string
  kind: "Lend" | "Loop" | "Borrow"
  apyLabel: "APY" | "Avg. APY"
  apy: string
  incentives?: string
  partnerRewards?: string
  points: string
  rewardRows?: RewardRow[]
  waitlistHref?: string
}

const LEND_ROWS: LendRow[] = [
  {
    href: "/vault/usx_rwa",
    protocol: "Solstice",
    protocolLogo: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    asset: "USX RWA",
    kind: "Lend",
    apyLabel: "APY",
    apy: "5.28%",
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
    apyLabel: "APY",
    apy: "1.59%",
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
    apyLabel: "APY",
    apy: "4.57%",
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
    apyLabel: "APY",
    apy: "",
    points: "",
    waitlistHref: "https://forms.gle/mxRQa5jWxJ1LD4zt7",
  },
  {
    href: "/vault/7n5F6vLutwTPuVju9t4ZC22vHyJNyGbHKzaokdyWycjy",
    protocol: "Fragmetric",
    protocolLogo: "https://bridgesplit-app.s3.amazonaws.com/organizations/fragmetric-logo.png",
    asset: "Fragmetric SOL",
    kind: "Lend",
    apyLabel: "APY",
    apy: "5.91%",
    points: "3.0x",
    rewardRows: [{ label: "Protocol Points", value: "3.0x" }],
  },
  {
    href: "/vault/xsol_one",
    protocol: "Hylo",
    protocolLogo: "https://bridgesplit-app.s3.amazonaws.com/logo/hylo.png",
    asset: "xSOL ONE",
    kind: "Lend",
    apyLabel: "APY",
    apy: "0.23%",
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
    apyLabel: "APY",
    apy: "-35.39%",
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
    apyLabel: "APY",
    apy: "6.23%",
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
    apyLabel: "Avg. APY",
    apy: "19.93%",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/onyc-usx",
    protocol: "OnRe",
    protocolLogo: "https://bridgesplit-app.s3.amazonaws.com/logo/onre_general.jpeg",
    asset: "ONyc/USX",
    kind: "Loop",
    apyLabel: "Avg. APY",
    apy: "8.89%",
    points: "8.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/syrupusdc-usx",
    protocol: "Solstice",
    protocolLogo: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    asset: "syrupUSDC/USX",
    kind: "Loop",
    apyLabel: "Avg. APY",
    apy: "-53.30%",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/eusx-usx",
    protocol: "Solstice",
    protocolLogo: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    asset: "eUSX/USX",
    kind: "Loop",
    apyLabel: "Avg. APY",
    apy: "6.23%",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/shyusd-hyusd",
    protocol: "Hylo",
    protocolLogo: "https://bridgesplit-app.s3.amazonaws.com/logo/hylo.png",
    asset: "sHYUSD/hyUSD",
    kind: "Loop",
    apyLabel: "Avg. APY",
    apy: "-52.11%",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/xsol-sol",
    protocol: "Hylo",
    protocolLogo: "https://bridgesplit-app.s3.amazonaws.com/logo/hylo.png",
    asset: "xSOL/SOL",
    kind: "Loop",
    apyLabel: "Avg. APY",
    apy: "17.81%",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/onyc-usdt",
    protocol: "OnRe",
    protocolLogo: "https://bridgesplit-app.s3.amazonaws.com/logo/onre_general.jpeg",
    asset: "ONyc/USDT",
    kind: "Loop",
    apyLabel: "Avg. APY",
    apy: "6.34%",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/hylosol-sol",
    protocol: "Hylo",
    protocolLogo: "https://bridgesplit-app.s3.amazonaws.com/logo/hylo.png",
    asset: "hyloSOL/SOL",
    kind: "Loop",
    apyLabel: "Avg. APY",
    apy: "17.63%",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/eusx-16sep26-usx",
    protocol: "Solstice",
    protocolLogo: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    asset: "PT-eUSX-16SEP26/USX",
    kind: "Loop",
    apyLabel: "Avg. APY",
    apy: "13.36%",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/pst-usx",
    protocol: "Solstice",
    protocolLogo: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    asset: "PST/USX",
    kind: "Loop",
    apyLabel: "Avg. APY",
    apy: "20.55%",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/onyc-usdc",
    protocol: "OnRe",
    protocolLogo: "https://bridgesplit-app.s3.amazonaws.com/logo/onre_general.jpeg",
    asset: "ONyc/USDC",
    kind: "Loop",
    apyLabel: "Avg. APY",
    apy: "-35.39%",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/bulksol-sol",
    protocol: "Bulk",
    protocolLogo: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/logo/bulk.png",
    asset: "BulkSOL/SOL",
    kind: "Loop",
    apyLabel: "Avg. APY",
    apy: "8.80%",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/shyusd-usdc",
    protocol: "Hylo",
    protocolLogo: "https://bridgesplit-app.s3.amazonaws.com/logo/hylo.png",
    asset: "sHYUSD/USDC",
    kind: "Loop",
    apyLabel: "Avg. APY",
    apy: "-26.72%",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/eusx-usdc",
    protocol: "Solstice",
    protocolLogo: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    asset: "eUSX/USDC",
    kind: "Loop",
    apyLabel: "Avg. APY",
    apy: "13.74%",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/prime-usx",
    protocol: "Solstice",
    protocolLogo: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    asset: "PRIME/USX",
    kind: "Loop",
    apyLabel: "Avg. APY",
    apy: "21.85%",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/loops/usx-16sep26-usx",
    protocol: "Solstice",
    protocolLogo: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    asset: "PT-USX-16SEP26/USX",
    kind: "Loop",
    apyLabel: "Avg. APY",
    apy: "21.85%",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
  {
    href: "/market/USX?role=borrow",
    protocol: "Solstice",
    protocolLogo: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png",
    asset: "USX",
    kind: "Borrow",
    apyLabel: "APY",
    apy: "",
    points: "2.0x",
    rewardRows: [{ label: "Protocol Points", value: "2.0x" }],
  },
]

const PAGE_SIZE = 12

export function MultiplyLendSection() {
  const [page, setPage] = React.useState(0)
  const pageCount = Math.ceil(LEND_ROWS.length / PAGE_SIZE)
  const visibleRows = LEND_ROWS.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  return (
    <section className="mt-8 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">Lend</h2>
        <Button type="button" variant="ghost" size="icon" aria-label="Adjust columns" className="h-8 w-8">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <div className="overflow-hidden rounded-radius-md border border-border bg-surface-raised shadow-elev-1">
        <div className="overflow-x-auto">
          <Table aria-label="inline table" className="min-w-[980px]">
            <colgroup>
              <col style={{ width: "180px" }} />
              <col style={{ width: "180px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "180px" }} />
              <col style={{ width: "180px" }} />
              <col style={{ width: "120px" }} />
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead aria-sort="descending">
                  <span className="inline-flex items-center gap-1">
                    <span>Protocol</span>
                  </span>
                </TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>APY</TableHead>
                <TableHead>
                  <span className="inline-flex items-center gap-1">
                    <span>Incentives</span>
                  </span>
                </TableHead>
                <TableHead>
                  <span className="inline-flex items-center gap-1">
                    <span>Partner Rewards</span>
                  </span>
                </TableHead>
                <TableHead>Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((row) => (
                <TableRow key={row.href}>
                  <TableCell className="p-0 align-middle">
                    <TableLink href={row.href} className="flex items-center gap-2 px-3 py-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={row.protocolLogo} alt="" aria-hidden="true" className="size-5 shrink-0 rounded-full object-cover" />
                      <span className="text-[13px] font-normal text-foreground">{row.protocol}</span>
                      {row.kind === "Borrow" ? <Badge className="ml-2 h-5 rounded-xs px-1.5 text-[10px]">Borrow</Badge> : null}
                    </TableLink>
                  </TableCell>
                  <TableCell className="p-0 align-middle">
                    <TableLink href={row.href} className="px-3 py-3 text-[13px] text-foreground">
                      {row.asset}
                    </TableLink>
                  </TableCell>
                  <TableCell className="p-0 align-middle">
                    <TableLink href={row.href} className="px-3 py-3">
                      {row.apy ? (
                        <span className={row.apy.startsWith("-") ? "font-data tabular-nums text-rose-600" : "font-data tabular-nums text-emerald-600"}>
                          {row.apy}
                        </span>
                      ) : row.kind === "Coming Soon" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : null}
                    </TableLink>
                  </TableCell>
                  <TableCell className="p-0 align-middle">
                    <TableLink href={row.href} className="px-3 py-3 text-[13px] text-foreground">
                      {row.incentives ?? ""}
                    </TableLink>
                  </TableCell>
                  <TableCell className="p-0 align-middle">
                    <TableLink href={row.href} className="px-3 py-3 text-[13px] text-foreground">
                      {row.partnerRewards ?? ""}
                    </TableLink>
                  </TableCell>
                  <TableCell className="p-0 align-middle">
                    {row.kind === "Coming Soon" ? (
                      <div className="px-3 py-3">
                        <Button asChild size="sm" className="h-7 rounded-xs px-2.5 text-[12px]">
                          <a href={row.waitlistHref} target="_blank" rel="noreferrer">
                            Join waitlist
                          </a>
                        </Button>
                      </div>
                    ) : (
                      <TableLink href={row.href} className="flex items-center justify-start px-3 py-3">
                        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-foreground">
                          <span aria-hidden className="text-[9px]">
                            {row.kind === "Loop" ? "▲" : "▲"}
                          </span>
                          {row.points}
                        </span>
                      </TableLink>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-3 py-2.5">
          <span className="text-[12px] text-muted-foreground">
            {page + 1} of {pageCount}
          </span>
          <Button type="button" variant="ghost" size="icon" aria-label="Previous page" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Next page" disabled={page >= pageCount - 1} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}

function TableLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={`block text-left transition-colors hover:bg-surface-inset/60 ${className ?? ""}`}>
      {children}
    </Link>
  )
}
