"use client"

import {
  AuiIf,
  ComposerPrimitive,
  type DataMessagePartProps,
  MessagePrimitive,
  type TextMessagePartProps,
  ThreadPrimitive,
  type ToolCallMessagePartProps,
  useAuiState,
} from "@assistant-ui/react"
import { Square } from "lucide-react"
import { useEffect, useState } from "react"
import { CircleArrowUp, Code2, PieChart, Sparkles, SunMedium, TrendingUp } from "@/app/components/icons"
import { ASK_AI_CONFIG } from "@/app/lib/ask-ai/config"
import { Chart } from "@/components/elements/chart"
import {
  Composer as ElementComposer,
  ComposerActions,
  ComposerBar,
  ComposerContext,
  ComposerToolbar,
} from "@/components/elements/composer"
import { GenerationLoader } from "@/components/elements/loading-state"
import { Onboarding } from "@/components/elements/onboarding"
import { ReasoningPanel } from "@/components/elements/reasoning-panel"
import { RetrievalChunks, type RetrievalChunk } from "@/components/elements/retrieval-chunks"
import { Sources, type Source } from "@/components/elements/sources"
import { StreamingText } from "@/components/elements/streaming-text"
import { ToolCall } from "@/components/elements/tool-call"

const SUGGESTIONS = [
  { icon: SunMedium, label: "Markets", prompt: "Find ETH/USDC markets" },
  { icon: Code2, label: "Positions", prompt: "Analyze my positions" },
  { icon: TrendingUp, label: "Borrow", prompt: "How much can I borrow?" },
  { icon: PieChart, label: "Risk", prompt: "What is my health factor?" },
  { icon: Sparkles, label: "Stress test", prompt: "What if ETH falls 20%?" },
]

const ONBOARDING_STEPS = [
  {
    title: "Ask about Avana",
    body: "Learn how Avana markets, LP collateral, lending, and borrowing work.",
    example: "Explain LP collateral",
  },
  {
    title: "Read your positions",
    body: "Connect a wallet when you want analysis grounded in your persisted positions.",
    example: "Analyze my positions",
  },
  {
    title: "Test risk",
    body: "Run read-only borrowing and collateral stress scenarios before you act.",
    example: "What if ETH falls 20%?",
  },
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
    <MessagePrimitive.Root className="px-2 text-foreground">
      <div className="flex flex-col gap-3">
        <MessagePrimitive.Parts
          components={{
            Text: StreamingTextPart,
            Empty: AssistantLoading,
            tools: { Fallback: ToolCallPart },
            data: {
              by_name: {
                "ask-ai-process": ProcessPart,
                retrieval: RetrievalPart,
                sources: SourcesPart,
                chart: ChartPart,
              },
            },
          }}
        />
      </div>
    </MessagePrimitive.Root>
  )
}

function StreamingTextPart({ text, status }: TextMessagePartProps) {
  return (
    <StreamingText
      segments={[{ text }]}
      count={text.split(/\s+/).filter(Boolean).length}
      streaming={status.type === "running"}
      className="min-h-0 max-w-none whitespace-pre-wrap text-[15px]"
    />
  )
}

function AssistantLoading() {
  const tick = useAuiState((state) => state.thread.messages.length)
  return <GenerationLoader label="Preparing Avana context" tick={tick} className="items-start py-3" />
}

function ProcessPart({ data, status }: DataMessagePartProps<{ category: string; intent: string }>) {
  const [open, setOpen] = useState(false)
  return (
    <ReasoningPanel
      steps={[
        { title: "Understand request", body: `Classified as ${data.intent.replaceAll("_", " ")}.` },
        {
          title: "Ground response",
          body: `Checking ${data.category.replaceAll("_", " ")} context and available Avana data.`,
        },
      ]}
      visibleSteps={2}
      streaming={status.type === "running"}
      open={open}
      onOpenChange={setOpen}
      restingLabel="Response process"
      className="max-w-none"
    />
  )
}

function ToolCallPart({ args, result, status, toolName }: ToolCallMessagePartProps) {
  const [open, setOpen] = useState(false)
  const input = args as { query?: string; request?: string }
  return (
    <ToolCall
      label={toolName.replaceAll("_", " ")}
      activeLabel={`Running ${toolName.replaceAll("_", " ")}`}
      query={input.query ?? "Avana"}
      request={input.request ?? "context lookup"}
      result={typeof result === "string" ? result : "Running"}
      running={status.type === "running" && result === undefined}
      open={open}
      onOpenChange={setOpen}
      className="max-w-none"
    />
  )
}

function RetrievalPart({ data, status }: DataMessagePartProps<{ query: string; chunks: RetrievalChunk[] }>) {
  return (
    <RetrievalChunks
      query={data.query}
      chunks={data.chunks}
      visibleCount={data.chunks.length}
      searching={status.type === "running" && data.chunks.length === 0}
      className="max-w-none"
    />
  )
}

function SourcesPart({ data }: DataMessagePartProps<Source[]>) {
  const [open, setOpen] = useState(false)
  return <Sources sources={data} open={open} onOpenChange={setOpen} className="max-w-none" />
}

function ChartPart({ data }: DataMessagePartProps<{ label: string; value: string; points: number[]; delta?: string }>) {
  return <Chart {...data} visibleCount={data.points.length} className="max-w-none" />
}

const messageComponents = {
  UserMessage,
  AssistantMessage,
} satisfies Parameters<typeof ThreadPrimitive.Messages>[0]["components"]

function Composer() {
  const characterCount = useAuiState((state) =>
    state.thread.messages.reduce(
      (total, message) =>
        total +
        message.content.reduce((messageTotal, part) => messageTotal + (part.type === "text" ? part.text.length : 0), 0),
      0,
    ),
  )
  const estimatedMessageTokens = Math.ceil(characterCount / 4 / 1_000)
  return (
    <ComposerPrimitive.Root className="relative flex w-full flex-col">
      <ElementComposer className="max-w-none">
        <ComposerBar className="cursor-text bg-card focus-within:border-border">
          <ComposerPrimitive.Input
            aria-label="Ask Avana a question"
            placeholder="Send a message... (@ to mention, / for commands)"
            maxLength={ASK_AI_CONFIG.maxInputCharacters}
            rows={1}
            autoFocus
            enterKeyHint="send"
            className="max-h-48 min-h-10 w-full resize-none bg-transparent px-2.5 py-1 text-base leading-6 outline-none placeholder:text-muted-foreground/60"
          />
          <ComposerToolbar className="relative">
            <span />
            <ComposerActions>
              <ComposerContext usage={{ system: 2, tools: 4, messages: estimatedMessageTokens, total: 128 }} />
              <AuiIf condition={(state) => state.thread.isRunning}>
                <ComposerPrimitive.Cancel
                  aria-label="Stop generating"
                  className="inline-flex size-7 items-center justify-center rounded-full bg-foreground text-background"
                >
                  <Square className="size-3 fill-current" />
                </ComposerPrimitive.Cancel>
              </AuiIf>
              <AuiIf condition={(state) => !state.thread.isRunning}>
                <ComposerPrimitive.Send
                  aria-label="Send message"
                  className="inline-flex size-7 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-40"
                >
                  <CircleArrowUp className="size-4" />
                </ComposerPrimitive.Send>
              </AuiIf>
            </ComposerActions>
          </ComposerToolbar>
        </ComposerBar>
      </ElementComposer>
    </ComposerPrimitive.Root>
  )
}

export function AskAIThread({
  title,
  threadsOpen,
  onToggleThreads,
}: {
  title: string
  threadsOpen: boolean
  onToggleThreads: () => void
}) {
  const isEmpty = useAuiState((state) => state.thread.messages.length === 0)
  const [onboardingIndex, setOnboardingIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!window.localStorage.getItem("avana.ask-ai.onboarded")) setOnboardingIndex(0)
  }, [])

  const finishOnboarding = () => {
    window.localStorage.setItem("avana.ask-ai.onboarded", "true")
    setOnboardingIndex(null)
  }

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
        <div className="min-w-0 truncate text-lg font-medium">{title}</div>
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
                {onboardingIndex !== null ? (
                  <Onboarding
                    steps={ONBOARDING_STEPS}
                    index={onboardingIndex}
                    onNext={() => {
                      if (onboardingIndex >= ONBOARDING_STEPS.length - 1) finishOnboarding()
                      else setOnboardingIndex((index) => (index ?? 0) + 1)
                    }}
                    onSkip={finishOnboarding}
                    className="mt-6 text-left"
                  />
                ) : null}
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
