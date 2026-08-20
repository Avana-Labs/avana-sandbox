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
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(86vw,300px)] flex-col border-r border-border/40 bg-[#fafafa] p-3 transition-transform dark:bg-surface-2 lg:static lg:z-auto lg:w-[250px] lg:shrink-0 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          className="flex h-12 items-center gap-3 rounded-xl bg-[#f1f1f1] px-4 text-left text-[15px] font-medium transition-colors hover:bg-[#e9e9e9] dark:bg-surface-hover"
        >
          <DashboardSquareAdd className="h-[18px] w-[18px]" />
          New Thread
        </button>

        <div className="mt-6 flex-1">
          <p className="px-2 text-xs font-medium text-muted-foreground">Today</p>
          <p className="mt-3 px-2 text-sm text-muted-foreground">No threads yet</p>
        </div>

        <p className="border-t border-border/60 px-2 pt-3 text-xs leading-5 text-muted-foreground">
          Ask AI explains and simulates. It never submits transactions.
        </p>
      </aside>
    </>
  )
}
