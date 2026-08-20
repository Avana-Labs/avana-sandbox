"use client"

import {
  AttachmentPrimitive,
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
import { useAction, useMutation } from "convex/react"
import { Check, Copy, Paperclip, Square, ThumbsDown, ThumbsUp, X } from "lucide-react"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import type { ComponentType } from "react"
import { CircleArrowUp, Code2, PieChart, Sparkles, SunMedium, TrendingUp } from "@/app/components/icons"
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
  ComposerVoiceButton,
} from "@/components/elements/composer"
import { GenerationLoader } from "@/components/elements/loading-state"
import { MessageQueue } from "@/components/elements/message-queue"
import { RetrievalChunks, type RetrievalChunk } from "@/components/elements/retrieval-chunks"
import { Sources, type Source } from "@/components/elements/sources"
import { MarkdownText } from "@/components/assistant-ui/markdown-text"
import { ToolCall } from "@/components/elements/tool-call"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { AskAIUsage } from "@/app/lib/ask-ai/chat-protocol"
import { AskAIFinancialResultCard, type AskAIFinancialResult } from "./ask-ai-financial-result-card"

const AskAIMessageContext = createContext<{ threadId: string | null; ensureThread?: () => Promise<string> }>({
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

function UserMessage() {
  return (
    <MessagePrimitive.Root className="relative mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col px-2 py-2">
      <div className="ml-auto max-w-[min(80%,32rem)] break-words rounded-3xl bg-muted px-5 py-2.5 leading-relaxed text-foreground [&_p]:mb-0">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  )
}

function AssistantMessage() {
  const { threadId } = useContext(AskAIMessageContext)
  const messageId = useAuiState((state) => state.message.id)
  const status = useAuiState((state) => state.message.status)
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
    <MessagePrimitive.Root className="px-2 text-foreground">
      <div className="flex flex-col gap-3">
        <MessagePrimitive.Parts
          components={{
            Text: AssistantText,
            Empty: AssistantLoading,
            tools: { Fallback: ToolCallPart },
            data: {
              by_name: {
                retrieval: RetrievalPart,
                sources: SourcesPart,
                chart: ChartPart,
                "financial-result": FinancialResultPart,
              },
            },
          }}
        />
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
      </div>
    </MessagePrimitive.Root>
  )
}

function AssistantLoading() {
  const tick = useAuiState((state) => state.thread.messages.length)
  return <GenerationLoader label="Preparing Avana context" tick={tick} className="items-start py-3" />
}

// Before the first token arrives (RAG search / tool calls), the assistant text part exists but is
// empty — show a thinking indicator instead of a blank bubble; render Markdown once text streams.
function AssistantText({ text, status }: TextMessagePartProps) {
  if (status.type === "running" && !text.trim()) return <AssistantLoading />
  return <MarkdownText />
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

function FinancialResultPart({ data }: DataMessagePartProps<AskAIFinancialResult>) {
  return <AskAIFinancialResultCard result={data} />
}

const messageComponents = {
  UserMessage,
  AssistantMessage,
} satisfies Parameters<typeof ThreadPrimitive.Messages>[0]["components"]

function Composer({ usage }: { usage?: AskAIUsage }) {
  const aui = useAui()
  const { threadId, ensureThread } = useContext(AskAIMessageContext)
  const [recording, setRecording] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const mediaStream = useRef<MediaStream | null>(null)
  const audioChunks = useRef<Blob[]>([])
  const generateUploadUrl = useMutation(api.askAIAttachments.generateUploadUrl)
  const registerAttachment = useMutation(api.askAIAttachments.register)
  const transcribeRecording = useAction(api.askAIVoice.transcribeRecording)
  const voiceSupported =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)

  const toggleVoice = async () => {
    if (recording) {
      mediaRecorder.current?.stop()
      return
    }
    if (!voiceSupported) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaStream.current = stream
      mediaRecorder.current = recorder
      audioChunks.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.current.push(event.data)
      }
      recorder.onstop = async () => {
        setRecording(false)
        mediaStream.current?.getTracks().forEach((track) => track.stop())
        mediaStream.current = null
        mediaRecorder.current = null
        try {
          const mimeType = recorder.mimeType || "audio/webm"
          const blob = new Blob(audioChunks.current, { type: mimeType })
          const uploadUrl = await generateUploadUrl({})
          const upload = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": mimeType }, body: blob })
          if (!upload.ok) throw new Error("Voice upload failed")
          const { storageId } = (await upload.json()) as { storageId: Id<"_storage"> }
          const recordingThreadId = threadId ?? (await ensureThread?.()) ?? null
          if (!recordingThreadId) throw new Error("Could not start a conversation for the recording")
          const attachmentId = await registerAttachment({
            threadId: recordingThreadId,
            storageId,
            name: "voice-recording.webm",
          })
          const transcript = await transcribeRecording({ attachmentId })
          aui.composer().setText(transcript.text)
        } catch (error) {
          setVoiceError(error instanceof Error ? error.message : "Voice transcription failed.")
        }
      }
      setVoiceError(null)
      setRecording(true)
      recorder.start()
    } catch (error) {
      setRecording(false)
      setVoiceError(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Microphone access was denied."
          : "Voice input could not start.",
      )
    }
  }

  return (
    <ComposerPrimitive.Root className="relative flex w-full flex-col">
      <ElementComposer className="max-w-none">
        <ComposerBar className="cursor-text bg-card focus-within:border-border">
          <ComposerPrimitive.Attachments>
            {() => (
              <AttachmentPrimitive.Root className="mx-2 mt-2 inline-flex max-w-full items-center gap-2 rounded-xl border border-border/70 bg-muted/40 px-3 py-1.5 text-xs">
                <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="max-w-52 truncate">
                  <AttachmentPrimitive.Name />
                </span>
                <AttachmentPrimitive.Remove
                  aria-label="Remove attachment"
                  className="inline-flex size-5 items-center justify-center rounded-full hover:bg-muted"
                >
                  <X className="size-3" />
                </AttachmentPrimitive.Remove>
              </AttachmentPrimitive.Root>
            )}
          </ComposerPrimitive.Attachments>
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
            <ComposerActions>
              <ComposerPrimitive.AddAttachment
                aria-label="Add attachment"
                className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Paperclip className="size-4" />
              </ComposerPrimitive.AddAttachment>
              {usage ? (
                <ComposerContext
                  usage={{
                    input: usage.inputTokens,
                    output: usage.outputTokens,
                    total: ASK_AI_CONFIG.contextWindowTokens,
                  }}
                />
              ) : null}
              {voiceSupported ? <ComposerVoiceButton active={recording} onClick={toggleVoice} /> : null}
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
          {voiceError ? (
            <p role="status" className="px-2.5 pb-1 text-xs text-muted-foreground">
              {voiceError}
            </p>
          ) : null}
        </ComposerBar>
      </ElementComposer>
    </ComposerPrimitive.Root>
  )
}

export function AskAIThread({
  title,
  threadsOpen,
  onToggleThreads,
  threadId,
  onEnsureThread,
  usage,
  canLoadMoreMessages,
  onLoadMoreMessages,
  queue,
  runningPrompt,
  onCancelQueued,
}: {
  title: string
  threadsOpen: boolean
  onToggleThreads: () => void
  threadId: string | null
  onEnsureThread?: () => Promise<string>
  usage?: AskAIUsage
  canLoadMoreMessages: boolean
  onLoadMoreMessages: () => void
  queue: readonly { id: string; prompt: string }[]
  runningPrompt?: string
  onCancelQueued: (turnId: string) => void | Promise<void>
}) {
  const isEmpty = useAuiState((state) => state.thread.messages.length === 0)
  return (
    <AskAIMessageContext.Provider value={{ threadId, ensureThread: onEnsureThread }}>
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

              <ThreadPrimitive.ViewportFooter
                className={`flex flex-col gap-4 overflow-visible bg-background pb-4 md:pb-6 ${
                  isEmpty ? "" : "sticky bottom-0 mt-auto rounded-t-3xl"
                }`}
              >
                {runningPrompt && queue.length ? (
                  <MessageQueue
                    running={runningPrompt}
                    queued={queue.map((turn) => ({ id: turn.id, text: turn.prompt }))}
                    onCancel={(turnId) => void onCancelQueued(turnId)}
                    className="mx-auto max-w-full"
                  />
                ) : null}
                <Composer usage={usage} />
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
