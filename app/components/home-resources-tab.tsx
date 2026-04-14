"use client"

import Image from "next/image"
import { Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

/** Deferred resources tab content for the homepage. */
export function HomeResourcesTab() {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold">Explore the Avana Sandbox</h3>
              <p className="text-muted-foreground">
                Use the latest Avana preview to test LP-backed borrowing flows and review the current protocol
                experience.
              </p>
            </div>

            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-4">
                <Users className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium">Sandbox URL</p>
                  <p className="text-sm text-muted-foreground">Open the latest Avana interface preview</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Input readOnly value="https://app.avana.cc" className="bg-muted" />
                <Button variant="outline">Copy</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="font-data text-2xl font-bold">12</div>
                    <p className="text-sm text-muted-foreground">Supported Venues</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="font-data text-2xl font-bold">$85.00</div>
                    <p className="text-sm text-muted-foreground">Design Foundation</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex-1 space-y-6">
            <Card className="bg-gradient-to-br from-[#FF007A]/10 to-background border-[#FF007A]/20">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#FF007A]/10 flex items-center justify-center mb-4">
                  <Image
                    src="https://cryptologos.cc/logos/uniswap-uni-logo.png"
                    alt="Uniswap"
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-semibold">Congratulations!</h4>
                  <p className="text-sm text-muted-foreground">
                    Review the Avana lightpaper for LP collateral design, spoke architecture, and liquidation
                    mechanics.
                  </p>
                </div>
                <Button className="w-full bg-[#FF007A] hover:bg-[#FF007A]/90 text-white">Open Avana Lightpaper</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Key Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Earned</TableHead>
                      <TableHead>Date</TableHead>
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
                        user: "Risk Warning",
                        earned: "Guidance",
                        date: "2026-01-18",
                        status: "Live",
                      },
                    ].map((resource) => (
                      <TableRow key={resource.id}>
                        <TableCell className="font-medium">{resource.user}</TableCell>
                        <TableCell>{resource.earned}</TableCell>
                        <TableCell>{resource.date}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full px-2 py-1 font-compact text-xs font-medium bg-emerald-50 text-emerald-700">
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
