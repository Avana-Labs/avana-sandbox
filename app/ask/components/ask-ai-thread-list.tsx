"use client"

import { DashboardSquareAdd, MessageSquare } from "@/app/components/icons"

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
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(86vw,320px)] flex-col border-r border-border bg-background p-4 transition-transform lg:static lg:z-auto lg:w-72 lg:shrink-0 lg:translate-x-0 lg:rounded-2xl lg:border ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Ask AI</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Conversation history</p>
          </div>
          <button
            type="button"
            aria-label="New thread"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <DashboardSquareAdd className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex-1">
          <div className="rounded-xl border border-dashed border-border px-4 py-5 text-center">
            <MessageSquare className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-3 text-sm text-foreground">No conversations yet</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Your Ask AI threads will appear here.</p>
          </div>
        </div>

        <p className="border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
          Ask AI explains and simulates. It never submits transactions.
        </p>
      </aside>
    </>
  )
}
