"use client"

import { ThreadListPrimitive } from "@assistant-ui/react"

export function AskAIThreadList({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close thread history"
          className="fixed inset-x-0 bottom-0 top-16 z-40 bg-black/20 lg:hidden"
          onClick={onClose}
        />
      ) : null}
      <aside
        aria-label="Ask AI thread history"
        className={`fixed bottom-0 left-0 top-16 z-50 flex w-[min(86vw,300px)] flex-col overflow-hidden border-r border-border/40 bg-background text-foreground transition-transform lg:static lg:z-auto lg:shrink-0 lg:border-r-0 lg:bg-muted/20 lg:transition-[width,padding] ${
          open ? "translate-x-0 p-3 lg:w-[260px]" : "-translate-x-full p-3 lg:w-0 lg:translate-x-0 lg:p-0"
        }`}
      >
        <ThreadListPrimitive.New asChild>
          <button
            type="button"
            className="flex h-8 items-center gap-2 rounded-md bg-muted px-2.5 text-left text-sm font-normal transition-colors hover:bg-muted/80"
          >
            <span
              aria-hidden
              className="inline-flex size-4 items-center justify-center text-xl font-light leading-none"
            >
              +
            </span>
            New Thread
          </button>
        </ThreadListPrimitive.New>

        <div className="mt-6 flex-1">
          <p className="px-2.5 text-xs font-medium text-muted-foreground">Today</p>
          <p className="mt-1 px-2.5 text-sm text-muted-foreground">No threads yet</p>
        </div>
      </aside>
    </>
  )
}
