"use client"

import Image from "next/image"
import { Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

/** Deferred resources tab content for the rewards page. */
export function RewardsResourcesTab() {
  return (
    <Card className="relative overflow-hidden border-border bg-surface-raised shadow-elev-1">
      <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/[0.04] via-transparent to-transparent" />
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row gap-5">
          <div className="flex-1 space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-[16px] font-medium tracking-tight text-foreground">Explore the Avana sandbox</h3>
              <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                Use the latest Avana preview to test LP-backed borrowing flows and review the current protocol
                experience.
              </p>
            </div>

            <div className="rounded-radius-sm border border-border bg-surface-inset p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xs border border-border bg-surface-raised">
                  <Users className="h-3.5 w-3.5 text-accent-primary" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-foreground">Sandbox URL</p>
                  <p className="text-[11.5px] text-muted-foreground">Open the latest Avana interface preview</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Input readOnly value="https://app.avana.cc" className="font-data text-[12.5px] bg-surface-raised" />
                <Button variant="outline" size="sm">Copy</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card className="border-border bg-surface-inset shadow-none">
                <CardContent className="pt-5">
                  <div className="text-center">
                    <div className="font-data text-[20px] font-medium tabular-nums text-foreground">12</div>
                    <p className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground mt-1">Supported venues</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border bg-surface-inset shadow-none">
                <CardContent className="pt-5">
                  <div className="text-center">
                    <div className="font-data text-[20px] font-medium tabular-nums text-foreground">$85.00</div>
                    <p className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground mt-1">Design foundation</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <Card className="bg-accent-primary/[0.04] border-accent-primary/25 shadow-none">
              <CardContent className="p-5 space-y-3">
                <div className="w-9 h-9 rounded-xs border border-accent-primary/25 bg-surface-raised flex items-center justify-center mb-2">
                  <Image
                    src="https://cryptologos.cc/logos/uniswap-uni-logo.png"
                    alt="Uniswap"
                    width={22}
                    height={22}
                    className="rounded-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-[15px] font-medium tracking-tight text-foreground">Avana lightpaper</h4>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    Review the Avana lightpaper for LP collateral design, spoke architecture, and liquidation
                    mechanics.
                  </p>
                </div>
                <Button className="w-full">Open Avana lightpaper</Button>
              </CardContent>
            </Card>

            <Card className="border-border bg-surface-inset shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-[13px] font-medium">Key resources</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resource</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      {
                        id: 1,
                        user: "Lightpaper",
                        earned: "Protocol",
                        date: "2026-01-18",
                        status: "Live",
                      },
                      {
                        id: 2,
                        user: "Risk warning",
                        earned: "Guidance",
                        date: "2026-01-18",
                        status: "Live",
                      },
                    ].map((resource) => (
                      <TableRow key={resource.id}>
                        <TableCell className="font-medium">{resource.user}</TableCell>
                        <TableCell className="text-muted-foreground">{resource.earned}</TableCell>
                        <TableCell className="font-data tabular-nums text-muted-foreground">{resource.date}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-xs border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-emerald-700 dark:text-emerald-400">
                            {resource.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
