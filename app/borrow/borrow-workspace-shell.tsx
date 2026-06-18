"use client"

import dynamic from "next/dynamic"
import type { BorrowWorkspaceData } from "@/app/lib/data/providers/borrow"

const BorrowWorkspace = dynamic(() => import("./components/borrow-workspace").then((mod) => mod.BorrowWorkspace), {
  ssr: false,
  loading: () => <div className="h-[960px] rounded-radius-md border border-border bg-surface-raised/60" />,
})

export function BorrowWorkspaceShell({ pageData }: { pageData: BorrowWorkspaceData }) {
  return <BorrowWorkspace pageData={pageData} />
}
