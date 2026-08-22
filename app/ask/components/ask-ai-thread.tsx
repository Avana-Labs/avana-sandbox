"use client"

import {
  AuiIf,
  ComposerPrimitive,
  type DataMessagePartProps,
  MessagePrimitive,
  type TextMessagePartProps,
  ThreadPrimitive,
  type ToolCallMessagePartProps,
  useAui,
  useAuiState,
} from "@assistant-ui/react"
import { useMutation } from "convex/react"
import Link from "next/link"
import { ArrowUp, Check, ChevronDown, Copy, Square, ThumbsDown, ThumbsUp } from "lucide-react"
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import type { ComponentType } from "react"
import { Code2, PieChart, Sparkles, SunMedium, TrendingUp } from "@/app/components/icons"
import { ASK_AI_CONFIG } from "@/app/lib/ask-ai/config"
import { Chart } from "@/components/elements/chart"
import { ErrorState } from "@/components/elements/error-state"
import { FeedbackDialog } from "@/components/elements/feedback-dialog"
import {
  Composer as ElementComposer,
  ComposerActions,
  ComposerBar,
  ComposerContext,
  ComposerToolbar,
} from "@/components/elements/composer"
import { ThinkingIndicator } from "@/components/elements/thinking-indicator"
import { AskAIThreadSkeleton } from "./ask-ai-skeleton"
import { MessageQueue } from "@/components/elements/message-queue"
import { RetrievalChunks, type RetrievalChunk } from "@/components/elements/retrieval-chunks"
import { Sources, type Source } from "@/components/elements/sources"
import { MarkdownText } from "@/components/assistant-ui/markdown-text"
import { ToolCall } from "@/components/elements/tool-call"
import { api } from "@/convex/_generated/api"
import type { AskAIUsage } from "@/app/lib/ask-ai/chat-protocol"
import { AskAIFinancialResultCard, type AskAIFinancialResult } from "./ask-ai-financial-result-card"

const AskAIMessageContext = createContext<{ threadId: string | null }>({
  threadId: null,
})
const FEEDBACK_REASONS = ["Incorrect", "Outdated data", "Not helpful", "Missing context", "Unsafe", "Other"]

export type AskAISuggestion = {
  icon: ComponentType<{ className?: string }>
  label: string
  prompt: string
}

// Single source of truth for the starter prompts. The thread renders these as
// labeled pills; the page-client derives the runtime `suggestions` adapter list
// from the same array so the two never drift.
export const ASK_AI_SUGGESTIONS: readonly AskAISuggestion[] = [
  { icon: SunMedium, label: "Markets", prompt: "Find ETH/USDC markets" },
  { icon: Code2, label: "Positions", prompt: "Analyze my positions" },
  { icon: TrendingUp, label: "Borrow", prompt: "How much can I borrow?" },
  { icon: PieChart, label: "Risk", prompt: "What is my health factor?" },
  { icon: Sparkles, label: "Stress test", prompt: "What if ETH falls 20%?" },
]

// User-facing error copy, keyed by the ConvexError `code` thrown server-side.
// Never surface raw error text (it can leak function paths / request ids).
export const ASK_AI_ERROR_COPY: Record<string, string> = {
  ASK_AI_GENERATION_FAILED: "Avana couldn't finish this answer. Please try again.",
  ASK_AI_ATTACHMENT_FAILED: "We couldn't read that attachment. Remove it and try again.",
  ASK_AI_RATE_LIMITED: "You're sending messages too quickly. Wait a moment, then try again.",
  ASK_AI_UNAVAILABLE: "Ask AI is temporarily unavailable. Please try again shortly.",
}
export const FALLBACK_ASK_AI_ERROR = "Something went wrong generating this answer. Please try again."

export type FriendlyAskAIError = { code?: string; message: string }

// Normalizes an unknown thrown value into a user-safe { code, message }. Reads
// the ConvexError payload (`error.data`) when present; otherwise falls back to
// generic copy. Never returns raw `String(error)`.
export function toFriendlyAskAIError(error: unknown): FriendlyAskAIError {
  const data = (error as { data?: unknown } | null | undefined)?.data
  if (data && typeof data === "object") {
    const record = data as { code?: unknown; message?: unknown }
    const code = typeof record.code === "string" ? record.code : undefined
    const message =
      typeof record.message === "string" && record.message.trim()
        ? record.message
        : ((code ? ASK_AI_ERROR_COPY[code] : undefined) ?? FALLBACK_ASK_AI_ERROR)
    return code ? { code, message } : { message }
  }
  return { message: FALLBACK_ASK_AI_ERROR }
}

// Resolves the detail line for the error card from a message `status.error`
// value (our FriendlyAskAIError, or nothing for a persisted failed turn).
export function resolveAskAIErrorDetail(rawError: unknown): string {
  if (rawError && typeof rawError === "object") {
    const err = rawError as { code?: unknown; message?: unknown }
    if (typeof err.message === "string" && err.message.trim()) return err.message
    if (typeof err.code === "string" && ASK_AI_ERROR_COPY[err.code]) return ASK_AI_ERROR_COPY[err.code]
  }
  return FALLBACK_ASK_AI_ERROR
}

// Muted timestamp revealed on message hover, mirroring Claude/ChatGPT. Reads the
// message createdAt from aui state; renders nothing if it is missing/invalid.
function MessageTimestamp({ align = "left" }: { align?: "left" | "right" }) {
  const createdAt = useAuiState((state) => (state.message as { createdAt?: unknown }).createdAt)
  if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) return null
  return (
    <time
      dateTime={createdAt.toISOString()}
      className={`px-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover/msg:opacity-100 ${
        align === "right" ? "self-end" : "self-start"
      }`}
    >
      {createdAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
    </time>
  )
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="group/msg relative mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col px-2 py-2">
      <div className="ml-auto max-w-[min(80%,32rem)] break-words rounded-3xl bg-muted px-5 py-2.5 leading-relaxed text-foreground [&_p]:mb-0">
        <MessagePrimitive.Content />
      </div>
      <MessageTimestamp align="right" />
    </MessagePrimitive.Root>
  )
}

function AssistantMessage() {
  const { threadId } = useContext(AskAIMessageContext)
  const messageId = useAuiState((state) => state.message.id)
  const status = useAuiState((state) => state.message.status)
  const contentLength = useAuiState((state) => state.message.content.length)
  const responseText = useAuiState((state) =>
    state.message.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n"),
  )
  const submitFeedback = useMutation(api.askAI.submitFeedback)
  const aui = useAui()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [note, setNote] = useState("")
  const [sent, setSent] = useState(false)
  const [copied, setCopied] = useState(false)
  const [helpful, setHelpful] = useState(false)
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => void (copyResetRef.current && clearTimeout(copyResetRef.current)), [])
  const persisted = !messageId.endsWith("-assistant")
  const hasContent = responseText.trim().length > 0
  const errorValue = status && "error" in status ? (status as { error?: unknown }).error : undefined
  return (
    <MessagePrimitive.Root className="group/msg px-2 text-foreground">
      {/* Announce streamed/settled answers to assistive tech as they arrive. */}
      <div className="flex flex-col gap-3" aria-live="polite" aria-atomic="false">
        {status?.type === "running" && contentLength === 0 ? (
          <ThinkingIndicatorLive />
        ) : (
          <MessagePrimitive.Parts components={assistantPartComponents} />
        )}
        <MessagePrimitive.Error>
          <ErrorState
            title="The response stopped"
            detail={resolveAskAIErrorDetail(errorValue)}
            retrying={false}
            // A live (transient) failed turn can be retried; a persisted failed
            // turn from a prior session has no replayable handle, so hide Retry.
            onRetry={persisted ? undefined : () => aui.message().reload()}
          />
        </MessagePrimitive.Error>
        {status?.type === "complete" && persisted && hasContent ? (
          <div className="flex flex-col items-start gap-2">
            {!feedbackOpen && !sent ? (
              <div className="flex items-center gap-1 text-muted-foreground">
                <button
                  type="button"
                  aria-label="Copy answer"
                  onClick={async () => {
                    await navigator.clipboard.writeText(responseText)
                    setCopied(true)
                    if (copyResetRef.current) clearTimeout(copyResetRef.current)
                    copyResetRef.current = setTimeout(() => setCopied(false), 2000)
                  }}
                  className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted hover:text-foreground"
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </button>
                <button
                  type="button"
                  aria-label="Mark answer as helpful"
                  disabled={helpful || !threadId}
                  onClick={async () => {
                    if (!threadId) return
                    await submitFeedback({ threadId, messageId, categories: ["Helpful"] })
                    setHelpful(true)
                  }}
                  className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  <ThumbsUp className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Report a problem with this answer"
                  onClick={() => setFeedbackOpen(true)}
                  className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted hover:text-foreground"
                >
                  <ThumbsDown className="size-4" />
                </button>
              </div>
            ) : null}
            {feedbackOpen || sent ? (
              <FeedbackDialog
                reasons={FEEDBACK_REASONS}
                selected={selected}
                note={note}
                sent={sent}
                onToggleReason={(reason) =>
                  setSelected((current) =>
                    current.includes(reason) ? current.filter((item) => item !== reason) : [...current, reason],
                  )
                }
                onNoteChange={setNote}
                onSubmit={async () => {
                  if (!threadId) return
                  await submitFeedback({ threadId, messageId, categories: selected, note })
                  setSent(true)
                }}
              />
            ) : null}
          </div>
        ) : null}
        {status?.type === "complete" && persisted && hasContent ? <MessageTimestamp /> : null}
      </div>
    </MessagePrimitive.Root>
  )
}

// Live "thinking" status line (assistant-ui element) with elapsed time, shown before the first token.
function ThinkingIndicatorLive({ label = "Thinking…" }: { label?: string }) {
  const [start] = useState(() => Date.now())
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setSeconds(Math.max(0, Math.round((Date.now() - start) / 1000))), 1000)
    return () => clearInterval(timer)
  }, [start])
  return <ThinkingIndicator label={label} elapsed={`${seconds}s`} className="py-3" />
}

// An empty streamed text part shows the thinking indicator. Otherwise render Markdown, which reveals smoothly as
// tokens arrive (assistant-ui smooth text) — one renderer for streaming and final, so there is no
// plain-text -> markdown swap and no resize jump.
function AssistantText({ text, status }: TextMessagePartProps) {
  if (status.type === "running" && !text.trim()) return <ThinkingIndicatorLive />
  return <MarkdownText />
}

// Human-readable status per tool, so the live indicator reads like an assistant
// ("Searching Avana knowledge…") rather than a raw function name.
const ASK_AI_TOOL_LABELS: Record<string, { active: string; done: string }> = {
  search_avana_knowledge: { active: "Searching Avana knowledge", done: "Searched Avana knowledge" },
  search_markets: { active: "Checking market data", done: "Checked market data" },
  read_pool_metrics: { active: "Reading pool metrics", done: "Read pool metrics" },
  read_portfolio: { active: "Reading your portfolio", done: "Read your portfolio" },
  read_borrow_capacity: { active: "Checking borrow capacity", done: "Checked borrow capacity" },
  read_position_risk: { active: "Analyzing position risk", done: "Analyzed position risk" },
  simulate_borrow: { active: "Simulating a borrow", done: "Simulated a borrow" },
  stress_position: { active: "Stress-testing your position", done: "Stress-tested your position" },
  web_search: { active: "Searching the web", done: "Searched the web" },
}

function ToolCallPart({ args, result, status, toolName }: ToolCallMessagePartProps) {
  const [open, setOpen] = useState(false)
  const input = args as { query?: string; request?: string }
  const labels = ASK_AI_TOOL_LABELS[toolName]
  return (
    <ToolCall
      label={labels?.done ?? toolName.replaceAll("_", " ")}
      activeLabel={labels?.active ?? `Running ${toolName.replaceAll("_", " ")}`}
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

function FinancialResultPart({ data }: DataMessagePartProps<AskAIFinancialResult>) {
  return <AskAIFinancialResultCard result={data} />
}

const messageComponents = {
  UserMessage,
  AssistantMessage,
} satisfies Parameters<typeof ThreadPrimitive.Messages>[0]["components"]

// assistant-ui registers part renderers through callback refs. Recreating this
// object during a running to complete transition detaches and reattaches those
// refs inside the store, which can recurse into React's maximum update depth.
const assistantPartComponents = {
  Text: AssistantText,
  tools: { Fallback: ToolCallPart },
  data: {
    by_name: {
      retrieval: RetrievalPart,
      sources: SourcesPart,
      chart: ChartPart,
      "financial-result": FinancialResultPart,
    },
  },
}

// Warm, in-voice quota nudge above the composer: a gentle heads-up as chats run
// low, and — once they're used up — an offer to hand off to the Avana team.
export function QuotaNudge({ remaining }: { remaining: number }) {
  if (remaining > 4) return null
  if (remaining > 0) {
    return (
      <div className="mx-auto w-full max-w-[var(--thread-max-width)] rounded-2xl border border-border/60 bg-muted/40 px-4 py-2.5 text-center text-sm text-foreground">
        Oh oh — only {remaining} chat{remaining === 1 ? "" : "s"} left for today! 💛 Let&apos;s make &apos;em count.
      </div>
    )
  }
  return (
    <div className="mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col items-center gap-2.5 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-center text-sm text-foreground">
      <span>
        Aw, that&apos;s all our chats for today! 💛 Want me to connect you with the Avana team so someone can keep
        helping?
      </span>
      <Link
        href="/support-center"
        className="inline-flex items-center rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background transition hover:opacity-90"
      >
        Talk to the team
      </Link>
    </div>
  )
}

function Composer({ usage, disabled = false }: { usage?: AskAIUsage; disabled?: boolean }) {
  const aui = useAui()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const selectionRef = useRef({ start: 0, end: 0 })
  const restoreSelection = useCallback((start: number, end = start) => {
    selectionRef.current = { start, end }
    requestAnimationFrame(() => inputRef.current?.setSelectionRange(start, end))
  }, [])
  return (
    <ComposerPrimitive.Root className="relative flex w-full flex-col" aria-disabled={disabled}>
      <ElementComposer className="max-w-none">
        <ComposerBar className="cursor-text bg-card focus-within:border-border">
          <ComposerPrimitive.Input
            ref={inputRef}
            aria-label="Ask Avana a question"
            placeholder={
              disabled ? "Your chats reset tomorrow" : "Ask Avana about markets, your positions, or how it works…"
            }
            maxLength={ASK_AI_CONFIG.maxInputCharacters}
            rows={1}
            disabled={disabled}
            enterKeyHint="send"
            // assistant-ui refocuses the composer on scroll-to-bottom and moves the
            // caret to the end. During typing the viewport auto-scrolls, so this
            // yanked the caret back to the end on every mid-sentence edit. Disable it.
            unstable_focusOnScrollToBottom={false}
            unstable_focusOnRunStart={false}
            unstable_focusOnThreadSwitched={false}
            onSelect={(event) => {
              selectionRef.current = {
                start: event.currentTarget.selectionStart,
                end: event.currentTarget.selectionEnd,
              }
            }}
            onChange={(event) => {
              restoreSelection(event.currentTarget.selectionStart, event.currentTarget.selectionEnd)
            }}
            onKeyDown={(event) => {
              if (event.altKey || event.ctrlKey || event.metaKey) return
              const input = event.currentTarget
              const selected = selectionRef.current
              if (event.key === "ArrowLeft" && selected.start === selected.end) {
                event.preventDefault()
                restoreSelection(Math.max(0, selected.start - 1))
              } else if (event.key === "ArrowRight" && selected.start === selected.end) {
                event.preventDefault()
                restoreSelection(Math.min(input.value.length, selected.end + 1))
              } else if (event.key === "Home") {
                event.preventDefault()
                restoreSelection(0)
              } else if (event.key === "End") {
                event.preventDefault()
                restoreSelection(input.value.length)
              } else if (
                event.key === "Delete" &&
                selected.start === selected.end &&
                selected.start < input.value.length
              ) {
                event.preventDefault()
                aui.composer.setText(input.value.slice(0, selected.start) + input.value.slice(selected.start + 1))
                restoreSelection(selected.start)
              } else if (event.key === "Backspace" && selected.start === selected.end && selected.start > 0) {
                event.preventDefault()
                const next = selected.start - 1
                aui.composer.setText(input.value.slice(0, next) + input.value.slice(selected.end))
                restoreSelection(next)
              }
            }}
            className="max-h-48 min-h-10 w-full resize-none bg-transparent px-2.5 py-1 text-base leading-6 outline-none placeholder:text-muted-foreground/60"
          />
          <ComposerToolbar className="relative">
            <ComposerActions>
              {usage ? (
                <ComposerContext
                  usage={{
                    input: usage.inputTokens,
                    output: usage.outputTokens,
                    total: ASK_AI_CONFIG.contextWindowTokens,
                  }}
                />
              ) : null}
            </ComposerActions>
            <ComposerActions>
              <AuiIf condition={(state) => state.thread.isRunning}>
                <ComposerPrimitive.Cancel
                  aria-label="Stop generating"
                  className="inline-flex size-9 items-center justify-center rounded-full bg-foreground text-background transition hover:bg-foreground/90"
                >
                  <Square className="size-3.5 fill-current" />
                </ComposerPrimitive.Cancel>
              </AuiIf>
              <AuiIf condition={(state) => !state.thread.isRunning}>
                <ComposerPrimitive.Send
                  aria-label="Send message"
                  className="inline-flex size-9 items-center justify-center rounded-full bg-foreground text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-foreground/15 disabled:text-foreground/40"
                >
                  <ArrowUp className="size-[18px]" />
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
  threadsOpen,
  onToggleThreads,
  threadId,
  usage,
  messagesRemaining = null,
  canLoadMoreMessages,
  onLoadMoreMessages,
  queue,
  runningPrompt,
  onCancelQueued,
  loading = false,
}: {
  threadsOpen: boolean
  onToggleThreads: () => void
  threadId: string | null
  usage?: AskAIUsage
  messagesRemaining?: number | null
  canLoadMoreMessages: boolean
  onLoadMoreMessages: () => void
  queue: readonly { id: string; prompt: string }[]
  runningPrompt?: string
  onCancelQueued: (turnId: string) => void | Promise<void>
  loading?: boolean
}) {
  const isEmpty = useAuiState((state) => state.thread.messages.length === 0)
  return (
    <AskAIMessageContext.Provider value={{ threadId }}>
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
        </div>

        <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col [--thread-max-width:44rem]">
          <ThreadPrimitive.Viewport
            // Classic bottom-anchored chat: the answer stays pinned to the bottom and
            // streams smoothly. "top" anchoring disables autoScroll, which made the
            // answer render at the top and then snap down.
            turnAnchor="bottom"
            className="relative flex flex-1 flex-col overflow-x-auto overflow-y-auto"
          >
            <div
              className={`mx-auto flex w-full max-w-[44rem] flex-1 flex-col px-4 pt-4 ${
                isEmpty && !loading ? "justify-center" : ""
              }`}
            >
              {loading ? (
                <AskAIThreadSkeleton />
              ) : (
                <>
                  <ThreadPrimitive.Empty>
                    <div className="mb-6 flex flex-col items-center gap-1.5 px-4 text-center">
                      <h1 className="text-2xl font-medium tracking-tight">
                        Hey, I&apos;m Avana! What&apos;s uuuup? ✨
                      </h1>
                      <p className="text-sm text-muted-foreground">
                        Ask me anything, your positions, or the markets. No question&apos;s too basic, promise! 💛
                      </p>
                    </div>
                  </ThreadPrimitive.Empty>

                  <div className="mb-14 flex flex-col gap-y-6 empty:hidden">
                    {canLoadMoreMessages ? (
                      <button
                        type="button"
                        onClick={onLoadMoreMessages}
                        className="mx-auto rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        Load earlier messages
                      </button>
                    ) : null}
                    <ThreadPrimitive.Messages components={messageComponents} />
                  </div>
                </>
              )}

              <ThreadPrimitive.ViewportFooter
                className={`flex flex-col gap-4 overflow-visible bg-background pb-4 md:pb-6 ${
                  isEmpty ? "" : "sticky bottom-0 mt-auto rounded-t-3xl"
                }`}
              >
                {/* Jump-to-latest pill; the primitive auto-hides when already at the bottom. */}
                <ThreadPrimitive.ScrollToBottom asChild>
                  <button
                    type="button"
                    aria-label="Scroll to latest"
                    className="absolute -top-12 left-1/2 z-10 inline-flex size-9 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition hover:text-foreground disabled:pointer-events-none disabled:opacity-0"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </ThreadPrimitive.ScrollToBottom>
                {runningPrompt && queue.length ? (
                  <MessageQueue
                    running={runningPrompt}
                    queued={queue.map((turn) => ({ id: turn.id, text: turn.prompt }))}
                    onCancel={(turnId) => void onCancelQueued(turnId)}
                    className="mx-auto max-w-full"
                  />
                ) : null}
                {messagesRemaining !== null ? <QuotaNudge remaining={messagesRemaining} /> : null}
                <Composer usage={usage} disabled={messagesRemaining === 0} />
                <ThreadPrimitive.Empty>
                  <div className="flex w-full flex-wrap items-center justify-center gap-2 px-4">
                    {ASK_AI_SUGGESTIONS.map(({ icon: Icon, label, prompt }) => (
                      <ThreadPrimitive.Suggestion
                        key={label}
                        prompt={prompt}
                        send
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
    </AskAIMessageContext.Provider>
  )
}
