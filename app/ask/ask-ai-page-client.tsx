"use client"

import {
  AssistantRuntimeProvider,
  type AttachmentAdapter,
  type AppendMessage,
  type ExternalThreadQueueAdapter,
  type ThreadAssistantMessagePart,
  type ThreadMessage,
  useExternalStoreRuntime,
} from "@assistant-ui/react"
import { useUIMessages } from "@convex-dev/agent/react"
import { useAction, useMutation, usePaginatedQuery, useQuery } from "convex/react"
import type { Id } from "@/convex/_generated/dataModel"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { AskAIUsage } from "@/app/lib/ask-ai/chat-protocol"
import { api } from "@/convex/_generated/api"
import {
  ASK_AI_SUGGESTIONS,
  AskAIThread,
  type FriendlyAskAIError,
  toFriendlyAskAIError,
} from "./components/ask-ai-thread"
import { AskAIThreadList } from "./components/ask-ai-thread-list"
import type { AskAIFinancialResult } from "./components/ask-ai-financial-result-card"

type PendingTurn = {
  id: string
  prompt: string
  startedAt: number
  error?: FriendlyAskAIError
}

// Mirrors docs/ask-ai-lane-contracts.md §1. Lane B persists these; Lane C only
// reads them and never fabricates fields that are absent.
type PersistedRichParts = {
  tool?: { name: string; query: string; request: string; result: string }
  retrievalChunks?: Array<{ title: string; locator: string; text: string; score?: number }>
  sources?: unknown[]
  visual?: unknown
  financialResults?: Array<{ kind?: string; dataProvenance?: string; payload: unknown }>
  usage?: AskAIUsage
}

type AskAIMetric = AskAIFinancialResult["metrics"][number]

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {}

const usd = (value: unknown): string | null =>
  typeof value === "number" && Number.isFinite(value)
    ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : null

const pct = (ratio: unknown): string | null =>
  typeof ratio === "number" && Number.isFinite(ratio)
    ? `${(ratio * 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`
    : null

// Health factor: null means no debt (effectively infinite); undefined/NaN → omit the metric.
const healthFactor = (value: unknown): string | null =>
  value === null
    ? "∞"
    : typeof value === "number" && Number.isFinite(value)
      ? value.toLocaleString("en-US", { maximumFractionDigits: 2 })
      : null

const metricOf = (label: string, value: string | null, after?: string | null): AskAIMetric | null =>
  value == null ? null : after != null ? { label, value, after } : { label, value }

// A financial tool result renders only when its verbatim payload already matches
// the card's display shape. Anything else is skipped — never fabricated.
function toFinancialResultCard(payload: unknown): AskAIFinancialResult | null {
  if (!payload || typeof payload !== "object") return null
  const record = payload as { kind?: unknown; title?: unknown; freshness?: unknown; asOf?: unknown; metrics?: unknown }
  if (typeof record.title !== "string" || !Array.isArray(record.metrics)) return null
  const metrics = record.metrics.filter(
    (metric): metric is AskAIMetric =>
      Boolean(metric) &&
      typeof metric === "object" &&
      typeof (metric as { label?: unknown }).label === "string" &&
      typeof (metric as { value?: unknown }).value === "string",
  )
  if (metrics.length === 0) return null
  const freshness =
    record.freshness === "fresh" || record.freshness === "stale" || record.freshness === "unavailable"
      ? record.freshness
      : undefined
  return {
    kind: (record.kind as AskAIFinancialResult["kind"]) ?? "portfolio",
    title: record.title,
    asOf: typeof record.asOf === "number" ? record.asOf : undefined,
    freshness,
    metrics,
  }
}

// Reshape a verbatim financial tool result (docs/ask-ai-lane-contracts.md §1) into the display
// card, per tool kind. Returns null (card hidden) when the figures are absent — never invents them.
function buildFinancialCard(kind: string | undefined, payload: unknown): AskAIFinancialResult | null {
  const shaped = toFinancialResultCard(payload)
  if (shaped) return shaped
  const p = asObject(payload)
  if (p.walletRequired === true) return null
  const asOf = typeof p.asOf === "number" && p.asOf > 0 ? p.asOf : undefined
  const compact = (
    cardKind: AskAIFinancialResult["kind"],
    title: string,
    metrics: Array<AskAIMetric | null>,
  ): AskAIFinancialResult | null => {
    const clean = metrics.filter((metric): metric is AskAIMetric => metric !== null)
    return clean.length ? { kind: cardKind, title, asOf, metrics: clean } : null
  }
  switch (kind) {
    case "portfolio": {
      const t = asObject(p.totals)
      return compact("portfolio", "Your Avana portfolio", [
        metricOf("Lend", usd(t.lendUsd)),
        metricOf("Borrow", usd(t.borrowUsd)),
        metricOf("Multiply", usd(t.multiplyUsd)),
        metricOf("Liquid", usd(t.liquidUsd)),
        metricOf("Umbrella", usd(t.umbrellaUsd)),
      ])
    }
    case "borrow_capacity": {
      const c = asObject(p.capacity)
      return compact("borrow_capacity", "Borrow capacity", [
        metricOf("Collateral", usd(c.collateralValueUsd)),
        metricOf("Borrow capacity", usd(c.borrowCapacityUsd)),
        metricOf("Available", usd(c.availableBorrowCapacityUsd)),
        metricOf("Borrowed", usd(c.totalBorrowedUsd)),
        metricOf("Current LTV", pct(c.currentLtv)),
        metricOf("Health factor", healthFactor(c.healthFactor)),
      ])
    }
    case "position_risk": {
      const b = asObject(asObject(p.engine).borrow)
      return compact("position_risk", "Position risk", [
        metricOf("Collateral", usd(b.collateralValueUsd)),
        metricOf("Borrowed", usd(b.totalBorrowedUsd)),
        metricOf("Available", usd(b.availableBorrowCapacityUsd)),
        metricOf("Current LTV", pct(b.currentLtv)),
        metricOf("Health factor", healthFactor(b.healthFactor)),
      ])
    }
    case "simulate_borrow": {
      const s = asObject(p.simulation)
      const cur = asObject(s.current)
      const proj = asObject(s.projected)
      return compact("position_risk", "Borrow simulation", [
        metricOf("Additional borrow", usd(p.additionalBorrowAmount)),
        metricOf("LTV", pct(cur.ltv), pct(proj.ltv)),
        metricOf("Health factor", healthFactor(cur.healthFactor), healthFactor(proj.healthFactor)),
        metricOf("Remaining capacity", usd(s.remainingBorrowCapacityUsd)),
        metricOf("Risk level", typeof s.riskLevel === "string" ? s.riskLevel : null),
      ])
    }
    case "stress_position": {
      const s = asObject(p.simulation)
      const cur = asObject(s.current)
      const proj = asObject(s.projected)
      const liquidatable = s.liquidatable
      return compact("position_risk", "Stress test", [
        metricOf("Scenario change", pct(s.weightedCollateralChange)),
        metricOf("Collateral", usd(cur.collateralValueUsd), usd(proj.collateralValueUsd)),
        metricOf("LTV", pct(cur.ltv), pct(proj.ltv)),
        metricOf("Health factor", healthFactor(cur.healthFactor), healthFactor(proj.healthFactor)),
        metricOf("Liquidatable", liquidatable === true ? "Yes" : liquidatable === false ? "No" : null),
      ])
    }
    default:
      return null
  }
}

const ACTIVE_THREAD_STORAGE_KEY = "avana.ask-ai.active-thread"

const assistantMetadata = () => ({
  unstable_state: null,
  unstable_annotations: [],
  unstable_data: [],
  steps: [],
  custom: {},
})
const messageText = (message: ThreadMessage) =>
  message.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")

function persistedAssistantParts(messageId: string, text: string, rich?: PersistedRichParts) {
  const parts: ThreadAssistantMessagePart[] = []
  if (rich?.retrievalChunks?.length) {
    parts.push({
      type: "data",
      name: "retrieval",
      data: {
        query: rich.tool?.query ?? "Avana",
        chunks: rich.retrievalChunks.map((chunk, index) => ({
          id: `${messageId}-chunk-${index}`,
          source: chunk.title,
          locator: chunk.locator,
          score: typeof chunk.score === "number" ? chunk.score : 0,
          text: chunk.text,
        })),
      },
    })
  }
  if (rich?.sources?.length) parts.push({ type: "data", name: "sources", data: rich.sources })
  if (rich?.visual) parts.push({ type: "data", name: "chart", data: rich.visual })
  for (const entry of rich?.financialResults ?? []) {
    const card = buildFinancialCard(entry.kind, entry.payload)
    if (card) parts.push({ type: "data", name: "financial-result", data: card })
  }
  parts.push({ type: "text", text })
  return parts
}

export function AskAIPageClient() {
  const [threadsOpen, setThreadsOpen] = useState(false)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.sessionStorage.getItem(ACTIVE_THREAD_STORAGE_KEY),
  )
  const [pendingTurn, setPendingTurn] = useState<PendingTurn | null>(null)
  const messageAttachments = useRef<string[]>([])
  const {
    results: threads,
    status: threadPageStatus,
    loadMore: loadMoreThreads,
  } = usePaginatedQuery(api.askAI.listPage, { status: "active" }, { initialNumItems: 30 })
  const {
    results: archivedThreads,
    status: archivedPageStatus,
    loadMore: loadMoreArchivedThreads,
  } = usePaginatedQuery(api.askAI.listPage, { status: "archived" }, { initialNumItems: 20 })
  const resolvedActiveThreadId = threads.some((thread) => thread.threadId === activeThreadId) ? activeThreadId : null
  const quota = useQuery(api.askAI.quota, {})
  const createThread = useMutation(api.askAI.create)
  const renameThread = useMutation(api.askAI.rename)
  const archiveThread = useMutation(api.askAI.archive)
  const unarchiveThread = useMutation(api.askAI.unarchive)
  const generateTurn = useAction(api.askAIAgent.generateTurn)
  const enqueueTurn = useMutation(api.askAI.enqueueTurn)
  const cancelQueuedTurn = useMutation(api.askAI.cancelQueuedTurn)
  const retryFailedTurn = useMutation(api.askAI.retryFailedTurn)
  const cancelRunningTurn = useMutation(api.askAI.cancelRunningTurn)
  const generateUploadUrl = useMutation(api.askAIAttachments.generateUploadUrl)
  const registerAttachment = useMutation(api.askAIAttachments.register)
  const processAttachment = useAction(api.askAIAttachments.process)
  const removeAttachment = useMutation(api.askAIAttachments.remove)
  const {
    results: messageResults,
    status: messagePageStatus,
    loadMore: loadMoreMessages,
  } = useUIMessages(api.askAI.messages, resolvedActiveThreadId ? { threadId: resolvedActiveThreadId } : "skip", {
    initialNumItems: 50,
    stream: true,
  })
  const turnQueue = useQuery(
    api.askAI.turnQueue,
    resolvedActiveThreadId ? { threadId: resolvedActiveThreadId } : "skip",
  )

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return
    const desktop = window.matchMedia("(min-width: 1024px)")
    const sync = () => setThreadsOpen(desktop.matches)
    sync()
    desktop.addEventListener("change", sync)
    return () => desktop.removeEventListener("change", sync)
  }, [])
  useEffect(() => {
    if (threadPageStatus === "LoadingFirstPage") return
    if (resolvedActiveThreadId) return
    setActiveThreadId(threads[0]?.threadId ?? null)
  }, [resolvedActiveThreadId, threadPageStatus, threads])
  useEffect(() => {
    if (activeThreadId) window.sessionStorage.setItem(ACTIVE_THREAD_STORAGE_KEY, activeThreadId)
    else window.sessionStorage.removeItem(ACTIVE_THREAD_STORAGE_KEY)
  }, [activeThreadId])

  const attachmentAdapter = useMemo<AttachmentAdapter>(
    () => ({
      accept: ".pdf,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp",
      add: async ({ file }) => {
        let threadId = resolvedActiveThreadId
        if (!threadId) {
          const thread = await createThread({})
          threadId = thread.threadId
          setActiveThreadId(threadId)
        }
        const uploadUrl = await generateUploadUrl({})
        const upload = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        })
        if (!upload.ok) throw new Error("Attachment upload failed")
        const { storageId } = (await upload.json()) as { storageId: Id<"_storage"> }
        const attachmentId = await registerAttachment({ threadId, storageId, name: file.name })
        await processAttachment({ attachmentId })
        return {
          id: attachmentId,
          type: file.type.startsWith("image/") ? "image" : "document",
          name: file.name,
          contentType: file.type,
          file,
          status: { type: "requires-action", reason: "composer-send" },
        }
      },
      remove: async (attachment) => {
        await removeAttachment({ attachmentId: attachment.id as Id<"askAIAttachments"> })
      },
      send: async (attachment) => ({
        ...attachment,
        status: { type: "complete" },
        content: [
          {
            type: "file",
            data: attachment.id,
            mimeType: attachment.contentType || "application/octet-stream",
            filename: attachment.name,
            sourceType: "id",
          },
        ],
      }),
    }),
    [createThread, generateUploadUrl, processAttachment, registerAttachment, removeAttachment, resolvedActiveThreadId],
  )

  const persistedMessages = useMemo<ThreadMessage[]>(
    () =>
      messageResults.flatMap((message): ThreadMessage[] => {
        const common = {
          id: message.id,
          content: [{ type: "text" as const, text: message.text }],
          createdAt: new Date(message._creationTime),
        }
        if (message.role === "user") return [{ ...common, role: "user", attachments: [], metadata: { custom: {} } }]
        if (message.role === "assistant")
          return [
            {
              ...common,
              content: persistedAssistantParts(
                message.id,
                message.text,
                message.richParts as PersistedRichParts | undefined,
              ),
              role: "assistant",
              status:
                message.status === "streaming" || message.status === "pending"
                  ? { type: "running" }
                  : message.status === "failed"
                    ? { type: "incomplete", reason: "error" }
                    : { type: "complete", reason: "stop" },
              metadata: assistantMetadata(),
            },
          ]
        return []
      }),
    [messageResults],
  )

  const handleNewThread = useCallback(async () => {
    setPendingTurn(null)
    const thread = await createThread({})
    setActiveThreadId(thread.threadId)
  }, [createThread])

  const sendPrompt = useCallback(
    async (prompt: string) => {
      if (!prompt) return
      let threadId = resolvedActiveThreadId
      if (!threadId) {
        const created = await createThread({})
        threadId = created.threadId
        setActiveThreadId(threadId)
      }
      await enqueueTurn({
        threadId,
        prompt,
        attachmentIds: (messageAttachments.current ?? []) as Id<"askAIAttachments">[],
      })
    },
    [createThread, enqueueTurn, resolvedActiveThreadId],
  )

  useEffect(() => {
    const next = turnQueue?.find((turn) => turn.status === "queued")
    if (!next || pendingTurn || !resolvedActiveThreadId) return
    const turnId = String(next.id)
    setPendingTurn({ id: turnId, prompt: next.prompt, startedAt: Date.now() })
    void generateTurn({
      threadId: resolvedActiveThreadId,
      prompt: next.prompt,
      retryPromptMessageId: next.promptMessageId,
    })
      .then(() => setPendingTurn((current) => (current?.id === turnId ? null : current)))
      .catch((error) =>
        setPendingTurn((current) =>
          current?.id === turnId ? { ...current, error: toFriendlyAskAIError(error) } : current,
        ),
      )
  }, [generateTurn, pendingTurn, resolvedActiveThreadId, turnQueue])

  const handleNewMessage = useCallback(
    async (message: AppendMessage) => {
      const prompt = message.content
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("\n")
        .trim()
      messageAttachments.current = message.attachments?.map((attachment) => attachment.id) ?? []
      await sendPrompt(prompt)
      messageAttachments.current = []
    },
    [sendPrompt],
  )

  const queueAdapter = useMemo<ExternalThreadQueueAdapter>(
    () => ({
      items: (turnQueue ?? [])
        .filter((turn) => turn.status === "queued")
        .map((turn) => ({
          id: String(turn.id),
          prompt: turn.prompt,
          parts: [{ type: "text" as const, text: turn.prompt }],
        })),
      steerItems: [],
      enqueue: (message) => void handleNewMessage(message),
      steer: (message) => void handleNewMessage(message),
      move: () => undefined,
      edit: (turnId, message) => {
        void cancelQueuedTurn({ turnId: turnId as Id<"askAITurns"> }).then(() => handleNewMessage(message))
      },
      remove: (turnId) => void cancelQueuedTurn({ turnId: turnId as Id<"askAITurns"> }),
    }),
    [cancelQueuedTurn, handleNewMessage, turnQueue],
  )

  const messages = useMemo<readonly ThreadMessage[]>(() => {
    if (!pendingTurn) return persistedMessages
    const persistedPrompt = persistedMessages.some(
      (message) =>
        message.role === "user" &&
        (message.createdAt?.getTime() ?? 0) >= pendingTurn.startedAt - 2_000 &&
        messageText(message) === pendingTurn.prompt,
    )
    const transient: ThreadMessage[] = []
    if (!persistedPrompt)
      transient.push({
        id: `${pendingTurn.id}-user`,
        role: "user",
        content: [{ type: "text", text: pendingTurn.prompt }],
        attachments: [],
        createdAt: new Date(pendingTurn.startedAt),
        metadata: { custom: {} },
      })
    if (pendingTurn.error)
      transient.push({
        id: `${pendingTurn.id}-assistant`,
        role: "assistant",
        content: [],
        status: { type: "incomplete", reason: "error", error: pendingTurn.error },
        createdAt: new Date(pendingTurn.startedAt + 1),
        metadata: assistantMetadata(),
      })
    return [...persistedMessages, ...transient]
  }, [pendingTurn, persistedMessages])

  const runtime = useExternalStoreRuntime({
    messages,
    isRunning: Boolean(pendingTurn && !pendingTurn.error),
    onNew: handleNewMessage,
    onReload: async () => {
      if (!pendingTurn?.error) return
      await retryFailedTurn({ turnId: pendingTurn.id as Id<"askAITurns"> })
      setPendingTurn(null)
    },
    onCancel: async () => {
      if (!resolvedActiveThreadId) return
      await cancelRunningTurn({ threadId: resolvedActiveThreadId })
      setPendingTurn(null)
    },
    queue: queueAdapter,
    adapters: { attachments: attachmentAdapter },
    suggestions: ASK_AI_SUGGESTIONS.map((suggestion) => ({ prompt: suggestion.prompt })),
  })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <main className="flex h-[calc(100dvh-64px)] w-full overflow-hidden lg:h-[calc(100dvh-68px)] [@media(min-height:684px)]:min-h-[620px]">
        <AskAIThreadList
          open={threadsOpen}
          activeThreadId={resolvedActiveThreadId}
          threads={threads}
          onClose={() => setThreadsOpen(false)}
          onNewThread={handleNewThread}
          onSelectThread={(threadId) => {
            setPendingTurn(null)
            setActiveThreadId(threadId)
          }}
          onRenameThread={async (threadId, title) => {
            await renameThread({ threadId, title })
          }}
          archivedThreads={archivedThreads}
          onArchiveThread={async (threadId) => {
            await archiveThread({ threadId })
            if (threadId === resolvedActiveThreadId) {
              setPendingTurn(null)
              setActiveThreadId(threads.find((thread) => thread.threadId !== threadId)?.threadId ?? null)
            }
          }}
          onUnarchiveThread={async (threadId) => {
            await unarchiveThread({ threadId })
            setActiveThreadId(threadId)
          }}
          quota={quota}
          canLoadMore={threadPageStatus === "CanLoadMore"}
          onLoadMore={() => loadMoreThreads(30)}
          canLoadMoreArchived={archivedPageStatus === "CanLoadMore"}
          onLoadMoreArchived={() => loadMoreArchivedThreads(20)}
        />
        <AskAIThread
          title={
            threads.find((thread) => thread.threadId === resolvedActiveThreadId)?.title ??
            (threadPageStatus === "LoadingFirstPage" ? "Loading…" : "New Chat")
          }
          threadsOpen={threadsOpen}
          onToggleThreads={() => setThreadsOpen((open) => !open)}
          threadId={resolvedActiveThreadId}
          usage={
            (
              messageResults.findLast(
                (message) =>
                  message.role === "assistant" && Boolean((message.richParts as PersistedRichParts | undefined)?.usage),
              )?.richParts as PersistedRichParts | undefined
            )?.usage
          }
          canLoadMoreMessages={messagePageStatus === "CanLoadMore"}
          onLoadMoreMessages={() => loadMoreMessages(50)}
          queue={(turnQueue ?? []).filter((turn) => turn.status === "queued")}
          runningPrompt={pendingTurn?.error ? undefined : pendingTurn?.prompt}
          onCancelQueued={async (turnId) => {
            await cancelQueuedTurn({ turnId: turnId as Id<"askAITurns"> })
          }}
        />
      </main>
    </AssistantRuntimeProvider>
  )
}
