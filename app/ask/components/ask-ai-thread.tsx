"use client"

import { ComposerPrimitive, MessagePrimitive, ThreadPrimitive, useAuiState } from "@assistant-ui/react"
import {
  ChevronDown,
  CircleArrowUp,
  Code2,
  MessageSquare,
  PieChart,
  Sparkles,
  SunMedium,
  TrendingUp,
} from "@/app/components/icons"
import { ASK_AI_CONFIG } from "@/app/lib/ask-ai/config"

const SUGGESTIONS = [
  { icon: SunMedium, label: "Markets", prompt: "Find ETH/USDC markets" },
  { icon: Code2, label: "Positions", prompt: "Analyze my positions" },
  { icon: TrendingUp, label: "Borrow", prompt: "How much can I borrow?" },
  { icon: PieChart, label: "Risk", prompt: "What is my health factor?" },
  { icon: Sparkles, label: "Stress test", prompt: "What if ETH falls 20%?" },
]

function UserMessage() {
  return (
    <MessagePrimitive.Root className="grid grid-cols-[minmax(72px,1fr)_auto] px-2">
      <div className="col-start-2 max-w-[85%] rounded-xl bg-muted px-4 py-2 leading-relaxed text-foreground">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  )
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="px-2 leading-relaxed text-foreground">
      <MessagePrimitive.Content />
    </MessagePrimitive.Root>
  )
}

const messageComponents = {
  UserMessage,
  AssistantMessage,
} satisfies Parameters<typeof ThreadPrimitive.Messages>[0]["components"]

function Composer() {
  return (
    <ComposerPrimitive.Root className="relative flex w-full flex-col">
      <div className="flex w-full cursor-text flex-col gap-2 rounded-3xl border border-border/60 bg-card p-2 transition-colors focus-within:border-border">
        <ComposerPrimitive.Input
          aria-label="Ask Avana a question"
          placeholder="Send a message... (@ to mention, / for commands)"
          maxLength={ASK_AI_CONFIG.maxInputCharacters}
          rows={1}
          autoFocus
          enterKeyHint="send"
          className="max-h-48 min-h-10 w-full resize-none bg-transparent px-2.5 py-1 text-base leading-6 outline-none placeholder:text-muted-foreground/60"
        />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Add attachment"
              className="inline-flex size-7 items-center justify-center rounded-full text-xl text-muted-foreground hover:bg-muted"
            >
              +
            </button>
            <button
              type="button"
              aria-label="Current model GPT-5.6 Luna"
              className="flex items-center gap-2 text-sm font-medium"
            >
              <span className="inline-flex size-5 items-center justify-center rounded-full border border-foreground text-[10px]">
                A
              </span>
              GPT-5.6 Luna
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Start voice input"
              className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <MessageSquare className="size-4" />
            </button>
            <ComposerPrimitive.Send
              aria-label="Send message"
              className="inline-flex size-7 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-40"
            >
              <CircleArrowUp className="size-4" />
            </ComposerPrimitive.Send>
          </div>
        </div>
      </div>
    </ComposerPrimitive.Root>
  )
}

export function AskAIThread({ threadsOpen, onToggleThreads }: { threadsOpen: boolean; onToggleThreads: () => void }) {
  const isEmpty = useAuiState((state) => state.thread.messages.length === 0)

  return (
    <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="flex h-16 shrink-0 items-center gap-3 px-5 sm:px-8">
        <button
          type="button"
          aria-label={threadsOpen ? "Hide sidebar" : "Open sidebar"}
          title={threadsOpen ? "Hide sidebar" : "Open sidebar"}
          onClick={onToggleThreads}
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <span aria-hidden className="relative block h-4 w-[18px] rounded-[3px] border border-current">
            <span className="absolute bottom-0 left-[5px] top-0 border-l border-current" />
          </span>
        </button>
        <div className="flex items-center text-lg font-medium">New Chat</div>
      </div>

      <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col [--thread-max-width:44rem]">
        <ThreadPrimitive.Viewport
          turnAnchor="top"
          className="relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth"
        >
          <div
            className={`mx-auto flex w-full max-w-[44rem] flex-1 flex-col px-4 pt-4 ${isEmpty ? "justify-center" : ""}`}
          >
            <ThreadPrimitive.Empty>
              <div className="mb-6 flex flex-col items-center px-4 text-center">
                <h1 className="text-2xl font-medium tracking-tight">How can I help you today?</h1>
              </div>
            </ThreadPrimitive.Empty>

            <div className="mb-14 flex flex-col gap-y-6 empty:hidden">
              <ThreadPrimitive.Messages components={messageComponents} />
            </div>

            <ThreadPrimitive.ViewportFooter
              className={`flex flex-col gap-4 overflow-visible bg-background pb-4 md:pb-6 ${
                isEmpty ? "" : "sticky bottom-0 mt-auto rounded-t-3xl"
              }`}
            >
              <Composer />
              <ThreadPrimitive.Empty>
                <div className="flex w-full flex-wrap items-center justify-center gap-2 px-4">
                  {SUGGESTIONS.map(({ icon: Icon, label, prompt }) => (
                    <ThreadPrimitive.Suggestion
                      key={label}
                      prompt={prompt}
                      send={false}
                      className="flex h-auto items-center gap-1.5 whitespace-nowrap rounded-full border border-border/60 px-3.5 py-1.5 text-sm font-normal text-foreground transition-colors hover:bg-muted"
                    >
                      <Icon className="size-4" aria-hidden />
                      {label}
                    </ThreadPrimitive.Suggestion>
                  ))}
                </div>
              </ThreadPrimitive.Empty>
            </ThreadPrimitive.ViewportFooter>
          </div>
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>
    </section>
  )
}
