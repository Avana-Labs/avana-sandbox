"use client"

import { ComposerPrimitive, MessagePrimitive, ThreadPrimitive } from "@assistant-ui/react"
import { CircleArrowUp, MessageSquare, Sparkles } from "@/app/components/icons"
import { ASK_AI_CONFIG } from "@/app/lib/ask-ai/config"

const SUGGESTIONS = [
  "How much can I borrow?",
  "Analyze my positions",
  "What is my health factor?",
  "What if ETH falls 20%?",
  "Explain LP collateral",
  "Find ETH/USDC markets",
]

function UserMessage() {
  return (
    <MessagePrimitive.Root className="mx-auto flex w-full max-w-3xl justify-end px-4 py-3">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-foreground px-4 py-3 text-sm leading-6 text-background">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  )
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="mx-auto flex w-full max-w-3xl gap-3 px-4 py-4">
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand/25 bg-brand/10 text-brand">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1 text-sm leading-6 text-foreground">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  )
}

const messageComponents = {
  UserMessage,
  AssistantMessage,
} satisfies Parameters<typeof ThreadPrimitive.Messages>[0]["components"]

export function AskAIThread({ onOpenThreads }: { onOpenThreads: () => void }) {
  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Open thread history"
            onClick={onOpenThreads}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground lg:hidden"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-medium">Ask Avana</h1>
            <p className="truncate text-xs text-muted-foreground">Markets, LP collateral, and position risk</p>
          </div>
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-[11px] font-medium text-muted-foreground">
          Read-only
        </span>
      </header>

      <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
        <ThreadPrimitive.Viewport className="flex min-h-0 flex-1 flex-col overflow-y-auto scroll-smooth">
          <ThreadPrimitive.Empty>
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-5 sm:px-8 sm:py-10">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand/25 bg-brand/10 text-brand">
                <Sparkles className="h-5 w-5" />
              </span>
              <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.4rem)] font-medium tracking-[-0.035em] sm:mt-5">
                Ask Avana
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:mt-3 sm:text-[15px]">
                Ask about your LP collateral, borrowing capacity, markets, or position risk.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-2 sm:mt-8 sm:grid-cols-2">
                {SUGGESTIONS.map((prompt) => (
                  <ThreadPrimitive.Suggestion
                    key={prompt}
                    prompt={prompt}
                    send={false}
                    className="rounded-xl border border-border bg-card px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:border-brand/35 hover:bg-brand/[0.035] sm:py-3"
                  >
                    {prompt}
                  </ThreadPrimitive.Suggestion>
                ))}
              </div>
            </div>
          </ThreadPrimitive.Empty>

          <ThreadPrimitive.Messages components={messageComponents} />

          <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-auto bg-background/95 px-3 pb-3 pt-2 backdrop-blur sm:px-5 sm:pb-5">
            <ComposerPrimitive.Root className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:border-brand/50">
              <ComposerPrimitive.Input
                aria-label="Ask Avana a question"
                placeholder="Ask about Avana, markets, or your position…"
                maxLength={ASK_AI_CONFIG.maxInputCharacters}
                rows={1}
                className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm leading-6 outline-none placeholder:text-muted-foreground"
              />
              <ComposerPrimitive.Send
                aria-label="Send message"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CircleArrowUp className="h-5 w-5" />
              </ComposerPrimitive.Send>
            </ComposerPrimitive.Root>
            <p className="mx-auto mt-2 max-w-3xl px-2 text-center text-[11px] leading-4 text-muted-foreground">
              Ask AI can make mistakes. Verify current market and position data before acting.
            </p>
          </ThreadPrimitive.ViewportFooter>
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>
    </section>
  )
}
