"use client"

import { ComposerPrimitive, MessagePrimitive, ThreadPrimitive } from "@assistant-ui/react"
import { ChevronDown, CircleArrowUp, MessageSquare } from "@/app/components/icons"
import { ASK_AI_CONFIG } from "@/app/lib/ask-ai/config"

const SUGGESTIONS = [
  { icon: "◉", label: "Positions", prompt: "Analyze my positions" },
  { icon: "↗", label: "Borrow", prompt: "How much can I borrow?" },
  { icon: "⌁", label: "Risk", prompt: "What is my health factor?" },
  { icon: "▥", label: "Markets", prompt: "Find ETH/USDC markets" },
  { icon: "◇", label: "Stress test", prompt: "What if ETH falls 20%?" },
]

function UserMessage() {
  return (
    <MessagePrimitive.Root className="mx-auto flex w-full max-w-[44rem] justify-end px-4 py-3">
      <div className="max-w-[85%] rounded-xl bg-muted px-4 py-2 text-sm leading-6 text-foreground">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  )
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="mx-auto flex w-full max-w-[44rem] px-4 py-3">
      <div className="min-w-0 flex-1 px-2 text-sm leading-7 text-foreground">
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
    <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <button
        type="button"
        aria-label="Open thread history"
        onClick={onOpenThreads}
        className="absolute left-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground lg:hidden"
      >
        <MessageSquare className="h-4 w-4" />
      </button>
      <div className="flex h-16 shrink-0 items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-3 pl-10 text-lg font-medium lg:pl-0">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-foreground/70 text-[11px]">
            ◫
          </span>
          New Chat
        </div>
        <button type="button" aria-label="Export conversation" className="text-xl text-muted-foreground">
          ⇧
        </button>
      </div>

      <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
        <ThreadPrimitive.Viewport
          turnAnchor="top"
          className="flex min-h-0 flex-1 flex-col overflow-y-auto scroll-smooth"
        >
          <ThreadPrimitive.Empty>
            <div className="mx-auto flex w-full max-w-[710px] flex-1 flex-col justify-center px-4 pb-10 text-center">
              <h1 className="text-[clamp(2rem,4vw,2.7rem)] font-medium tracking-[-0.035em]">
                How can I help you today?
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                Ask about Avana, LP collateral, borrowing capacity, markets, or position risk.
              </p>

              <ComposerPrimitive.Root className="mt-8 flex min-h-[118px] w-full flex-col rounded-[24px] border border-border/70 bg-background p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus-within:border-border">
                <ComposerPrimitive.Input
                  aria-label="Ask Avana a question"
                  placeholder="Send a message..."
                  maxLength={ASK_AI_CONFIG.maxInputCharacters}
                  rows={2}
                  className="max-h-48 min-h-[54px] w-full resize-none bg-transparent px-2 py-1 text-base leading-6 outline-none placeholder:text-muted-foreground/60"
                />
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Add context"
                      className="inline-flex h-8 w-8 items-center justify-center text-xl text-muted-foreground"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-2 text-sm font-medium"
                      aria-label="Current model GPT-5.6 Luna"
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-foreground text-[10px]">
                        A
                      </span>
                      GPT-5.6 Luna
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Voice input"
                      className="inline-flex h-8 w-8 items-center justify-center text-lg text-muted-foreground"
                    >
                      ♫
                    </button>
                    <ComposerPrimitive.Send
                      aria-label="Send message"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-40"
                    >
                      <CircleArrowUp className="h-5 w-5" />
                    </ComposerPrimitive.Send>
                  </div>
                </div>
              </ComposerPrimitive.Root>

              <div className="mt-4 flex w-full flex-wrap items-center justify-center gap-2 px-2">
                {SUGGESTIONS.map(({ icon, label, prompt }) => (
                  <ThreadPrimitive.Suggestion
                    key={label}
                    prompt={prompt}
                    send={false}
                    className="flex h-auto items-center gap-2 rounded-full border border-border/70 px-4 py-2 text-sm font-normal text-foreground transition-colors hover:bg-muted"
                  >
                    <span aria-hidden className="text-base">
                      {icon}
                    </span>
                    {label}
                  </ThreadPrimitive.Suggestion>
                ))}
              </div>
            </div>
          </ThreadPrimitive.Empty>

          <ThreadPrimitive.Messages components={messageComponents} />

          <ThreadPrimitive.If empty={false}>
            <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-auto bg-background px-4 pb-4 pt-2 md:pb-6">
              <ComposerPrimitive.Root className="mx-auto flex w-full max-w-[44rem] items-end gap-2 rounded-3xl border border-border/60 bg-card p-2 transition-colors focus-within:border-border">
                <ComposerPrimitive.Input
                  aria-label="Ask Avana a question"
                  placeholder="Send a message..."
                  maxLength={ASK_AI_CONFIG.maxInputCharacters}
                  rows={1}
                  className="max-h-48 min-h-10 flex-1 resize-none bg-transparent px-2.5 py-1.5 text-base leading-6 outline-none placeholder:text-muted-foreground/60"
                />
                <ComposerPrimitive.Send
                  aria-label="Send message"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <CircleArrowUp className="h-5 w-5" />
                </ComposerPrimitive.Send>
              </ComposerPrimitive.Root>
              <p className="mx-auto mt-2 max-w-[44rem] px-2 text-center text-[11px] leading-4 text-muted-foreground">
                Ask AI can make mistakes. Verify current market and position data before acting.
              </p>
            </ThreadPrimitive.ViewportFooter>
          </ThreadPrimitive.If>
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>
    </section>
  )
}
