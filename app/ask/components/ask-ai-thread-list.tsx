"use client"

import { DashboardSquareAdd } from "@/app/components/icons"

export function AskAIThreadList({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close thread history"
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={onClose}
        />
      ) : null}
      <aside
        aria-label="Ask AI thread history"
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(86vw,300px)] flex-col overflow-hidden bg-muted/20 text-foreground transition-[width,padding,transform] lg:static lg:z-auto lg:shrink-0 lg:translate-x-0 ${
          open ? "translate-x-0 p-3 lg:w-[260px]" : "-translate-x-full p-3 lg:w-0 lg:translate-x-0 lg:p-0"
        }`}
      >
        <button
          type="button"
          className="flex h-8 items-center gap-2 rounded-md bg-muted px-2.5 text-left text-sm font-normal transition-colors hover:bg-muted/80"
        >
          <DashboardSquareAdd className="h-[18px] w-[18px]" />
          New Thread
        </button>

        <div className="mt-6 flex-1">
          <p className="px-2.5 text-xs font-medium text-muted-foreground">Today</p>
          <p className="mt-1 px-2.5 text-sm text-muted-foreground">No threads yet</p>
        </div>
      </aside>
    </>
  )
}
