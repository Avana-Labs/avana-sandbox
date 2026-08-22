"use client"

import {
  AssistantRuntimeProvider,
  type AppendMessage,
  type ExternalThreadQueueAdapter,
  type ThreadAssistantMessagePart,
  type ThreadMessage,
  useExternalStoreRuntime,
} from "@assistant-ui/react"
import { useUIMessages } from "@convex-dev/agent/react"
import { useMutation, usePaginatedQuery, useQuery } from "convex/react"
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
import { AskAIMessagePartsSubscriber, type AskAIMessagePartsRow } from "./message-parts-subscriber"

type PendingTurn = {
  id: string
  clientRequestId: string
  promptMessageId?: string
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
  visual?: { label: string; value: string; points: number[]; delta?: string }
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
  const table = (
    cardKind: AskAIFinancialResult["kind"],
    title: string,
    columns: string[],
    rows: Array<{ id: string; cells: string[] }>,
    metrics: AskAIMetric[] = [],
  ): AskAIFinancialResult | null => (rows.length ? { kind: cardKind, title, asOf, metrics, columns, rows } : null)
  switch (kind) {
    case "portfolio": {
      const t = asObject(p.totals)
      const productRows = [
        ["Lend", usd(t.lendUsd)],
        ["Borrow", usd(t.borrowUsd)],
        ["Multiply", usd(t.multiplyUsd)],
        ["Liquid", usd(t.liquidUsd)],
      ].flatMap(([product, value], index) =>
        value ? [{ id: `product-${index}`, cells: [product ?? "", "All positions", value] }] : [],
      )
      const umbrellaRows = Array.isArray(p.umbrella)
        ? p.umbrella.flatMap((position, index) => {
            const row = asObject(position)
            const value = usd(
              typeof row.suppliedUsd6 === "string" ? Number(row.suppliedUsd6) / 1_000_000 : row.suppliedUsd,
            )
            if (!value) return []
            return [
              {
                id: `umbrella-${index}`,
                cells: ["Umbrella", String(row.marketSlug ?? row.marketId ?? `Position ${index + 1}`), value],
              },
            ]
          })
        : []
      return table(
        "portfolio",
        "Your Avana portfolio",
        ["Product", "Position", "Value"],
        [...productRows, ...umbrellaRows],
        [metricOf("Total Umbrella", usd(t.umbrellaUsd))].filter((metric): metric is AskAIMetric => metric !== null),
      )
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
    case "market": {
      const providerData = Array.isArray(p.providerData) ? p.providerData : []
      const rows = providerData.flatMap((entry, index) => {
        const result = asObject(entry)
        const data = asObject(result.data)
        const label = String(data.symbol ?? data.pool ?? data.name ?? result.key ?? "Market")
        const rate =
          usd(data.priceUsd) ??
          (typeof data.apyPct === "number"
            ? `${data.apyPct.toLocaleString("en-US", { maximumFractionDigits: 2 })}% APY`
            : null) ??
          (typeof data.supplyApyPct === "number"
            ? `${data.supplyApyPct.toLocaleString("en-US", { maximumFractionDigits: 2 })}% supply`
            : "Unavailable")
        const size = usd(data.tvlUsd) ?? usd(data.sizeUsd) ?? usd(data.availableLiquidityUsd) ?? "Unavailable"
        return [
          {
            id: `market-${index}-${String(result.key ?? label)}`,
            cells: [label, rate, size, String(result.source ?? "Convex")],
          },
        ]
      })
      return table("market", "Market results", ["Market", "Price or rate", "TVL or size", "Source"], rows)
    }
    case "pool": {
      const providerData = Array.isArray(p.providerData) ? p.providerData : []
      const rows = providerData.map((entry, index) => {
        const result = asObject(entry)
        const data = asObject(result.data)
        return {
          id: `pool-${index}`,
          cells: [
            String(data.symbol ?? data.pool ?? asObject(p.market).symbol ?? "Pool"),
            usd(data.tvlUsd) ?? usd(data.liquidityUsd) ?? "Unavailable",
            typeof data.apyPct === "number" ? `${data.apyPct.toFixed(2)}%` : "Unavailable",
            String(result.source ?? "Convex"),
          ],
        }
      })
      return table("pool", "Pool metrics", ["Pool", "TVL", "APY", "Source"], rows)
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

export function AskAIPageClient({
  onActiveTitleChange,
}: {
  onActiveTitleChange?: (title: string | null) => void
} = {}) {
  const [threadsOpen, setThreadsOpen] = useState(false)
  // This component is mounted client-only (gated on useHydrated in ask-page-client), so reading
  // sessionStorage in the initializer is safe and restores the active thread on the first paint.
  const [activeThreadId, setActiveThreadId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.sessionStorage.getItem(ACTIVE_THREAD_STORAGE_KEY),
  )
  // A newly created thread is returned before the paginated thread query can
  // include it. Keep that explicit selection stable during the subscription
  // gap instead of falling back to the previous first thread.
  const pendingActiveThreadRef = useRef<string | null>(null)
  const creatingThreadRef = useRef<Promise<{ threadId: string }> | null>(null)
  // The runtime can retain an older onNew callback for one render. Keep the
  // selected thread in a ref as well, so submitting immediately after New Thread
  // cannot enqueue into the previously selected conversation.
  const activeThreadIdRef = useRef<string | null>(activeThreadId)
  const [pendingTurn, setPendingTurn] = useState<PendingTurn | null>(null)
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
  // Surface the active thread's subject to the app-shell header ("Ask AI" when blank/new).
  const activeThreadTitle = threads.find((thread) => thread.threadId === resolvedActiveThreadId)?.title ?? null
  useEffect(() => {
    onActiveTitleChange?.(activeThreadTitle && activeThreadTitle !== "New Chat" ? activeThreadTitle : null)
  }, [activeThreadTitle, onActiveTitleChange])
  const quota = useQuery(api.askAI.quota, {})
  const createThread = useMutation(api.askAI.create)
  const renameThread = useMutation(api.askAI.rename)
  const archiveThread = useMutation(api.askAI.archive)
  const unarchiveThread = useMutation(api.askAI.unarchive)
  const enqueueTurn = useMutation(api.askAI.enqueueTurn)
  const cancelQueuedTurn = useMutation(api.askAI.cancelQueuedTurn)
  const retryFailedTurn = useMutation(api.askAI.retryFailedTurn)
  const cancelRunningTurn = useMutation(api.askAI.cancelRunningTurn)
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
  // Rich assistant parts (cards/sources) come from a separate, non-streamed query
  // (so they aren't re-fetched per streamed token) via a fail-soft subscriber that
  // can't blank the chat if that query errors. Merged into the messages by id.
  // The subscriber remounts per thread (keyed), so stale parts from a previous
  // thread simply go unmatched (message ids are globally unique) until the new
  // thread's parts load — no separate reset effect (which would race the child).
  const [messageParts, setMessageParts] = useState<AskAIMessagePartsRow[]>([])
  const richPartsByMessage = useMemo(
    () => new Map(messageParts.map((row) => [row.messageId, row.parts as PersistedRichParts | undefined])),
    [messageParts],
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
    if (resolvedActiveThreadId) {
      if (pendingActiveThreadRef.current === resolvedActiveThreadId) pendingActiveThreadRef.current = null
      return
    }
    if (activeThreadId && pendingActiveThreadRef.current === activeThreadId) return
    const fallbackThreadId = threads[0]?.threadId ?? null
    activeThreadIdRef.current = fallbackThreadId
    setActiveThreadId(fallbackThreadId)
  }, [activeThreadId, resolvedActiveThreadId, threadPageStatus, threads])
  useEffect(() => {
    if (activeThreadId) window.sessionStorage.setItem(ACTIVE_THREAD_STORAGE_KEY, activeThreadId)
    else window.sessionStorage.removeItem(ACTIVE_THREAD_STORAGE_KEY)
  }, [activeThreadId])

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
              content: persistedAssistantParts(message.id, message.text, richPartsByMessage.get(message.id)),
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
    [messageResults, richPartsByMessage],
  )

  const handleNewThread = useCallback(async () => {
    setPendingTurn(null)
    const creating = createThread({})
    creatingThreadRef.current = creating
    try {
      const thread = await creating
      pendingActiveThreadRef.current = thread.threadId
      activeThreadIdRef.current = thread.threadId
      setActiveThreadId(thread.threadId)
    } finally {
      if (creatingThreadRef.current === creating) creatingThreadRef.current = null
    }
  }, [createThread])

  // Cmd/Ctrl+K starts a new chat, matching the Claude/ChatGPT shortcut.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        void handleNewThread()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [handleNewThread])

  const sendPrompt = useCallback(
    async (prompt: string) => {
      if (!prompt) return
      const clientRequestId = crypto.randomUUID()
      const startedAt = Date.now()
      setPendingTurn({ id: clientRequestId, clientRequestId, prompt, startedAt })
      try {
        const creatingThread = creatingThreadRef.current
        let threadId = creatingThread ? (await creatingThread).threadId : activeThreadIdRef.current
        if (!threadId) {
          const created = await createThread({})
          threadId = created.threadId
          pendingActiveThreadRef.current = threadId
          activeThreadIdRef.current = threadId
          setActiveThreadId(threadId)
        }
        const queued = await enqueueTurn({ threadId, prompt, clientRequestId })
        setPendingTurn((current) =>
          current?.clientRequestId === clientRequestId
            ? { ...current, id: String(queued.turnId), promptMessageId: queued.promptMessageId }
            : current,
        )
      } catch (error) {
        setPendingTurn((current) =>
          current?.clientRequestId === clientRequestId ? { ...current, error: toFriendlyAskAIError(error) } : current,
        )
      }
    },
    [createThread, enqueueTurn],
  )

  // Execution is claimed and scheduled by Convex. The browser only reflects the
  // durable state, so tabs, remounts, and duplicate subscriptions cannot run a turn.
  useEffect(() => {
    const current =
      turnQueue?.find((turn) => turn.status === "running") ??
      turnQueue?.find((turn) => turn.status === "queued") ??
      turnQueue?.find((turn) => turn.status === "failed")
    if (current) {
      setPendingTurn((pending) => ({
        id: String(current.id),
        clientRequestId: current.clientRequestId ?? pending?.clientRequestId ?? String(current.id),
        promptMessageId: current.promptMessageId,
        prompt: current.prompt,
        startedAt: pending?.id === String(current.id) ? pending.startedAt : Date.now(),
        ...(current.status === "failed"
          ? { error: toFriendlyAskAIError(new Error("Ask AI could not complete this response")) }
          : {}),
      }))
      return
    }
    setPendingTurn((pending) =>
      pending?.promptMessageId && persistedMessages.some((message) => message.id === pending.promptMessageId)
        ? null
        : pending,
    )
  }, [persistedMessages, turnQueue])

  const handleNewMessage = useCallback(
    async (message: AppendMessage) => {
      const prompt = message.content
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("\n")
        .trim()
      await sendPrompt(prompt)
    },
    [sendPrompt],
  )

  const queueAdapter = useMemo<ExternalThreadQueueAdapter>(
    () => ({
      items: (turnQueue ?? [])
        // Exclude the turn currently being generated: while beginTurn flips it
        // queued -> running, it is optimistically running (pendingTurn) yet still
        // reads "queued" from the server for a beat, which showed it twice.
        .filter((turn) => turn.status === "queued" && String(turn.id) !== pendingTurn?.id)
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
    [cancelQueuedTurn, handleNewMessage, turnQueue, pendingTurn?.id],
  )

  const messages = useMemo<readonly ThreadMessage[]>(() => {
    if (!pendingTurn) return persistedMessages
    const persistedPrompt = persistedMessages.some(
      (message) => message.role === "user" && message.id === pendingTurn.promptMessageId,
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
    const promptIndex = pendingTurn.promptMessageId
      ? persistedMessages.findIndex((message) => message.id === pendingTurn.promptMessageId)
      : -1
    const hasPersistedAssistant =
      promptIndex >= 0 && persistedMessages.slice(promptIndex + 1).some((message) => message.role === "assistant")
    if (pendingTurn.error && !hasPersistedAssistant)
      transient.push({
        id: `${pendingTurn.id}-assistant`,
        role: "assistant",
        content: [],
        status: { type: "incomplete", reason: "error", error: pendingTurn.error },
        createdAt: new Date(pendingTurn.startedAt + 1),
        metadata: assistantMetadata(),
      })
    else if (!hasPersistedAssistant)
      transient.push({
        id: `${pendingTurn.id}-assistant`,
        role: "assistant",
        content: [],
        status: { type: "running" },
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
    suggestions: ASK_AI_SUGGESTIONS.map((suggestion) => ({ prompt: suggestion.prompt })),
  })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AskAIMessagePartsSubscriber threadId={resolvedActiveThreadId} onData={setMessageParts} />
      <main className="flex h-[calc(100dvh-64px)] w-full overflow-hidden lg:h-[calc(100dvh-68px)] [@media(min-height:684px)]:min-h-[620px]">
        <AskAIThreadList
          open={threadsOpen}
          activeThreadId={resolvedActiveThreadId}
          threads={threads}
          onClose={() => setThreadsOpen(false)}
          onNewThread={handleNewThread}
          onSelectThread={(threadId) => {
            setPendingTurn(null)
            activeThreadIdRef.current = threadId
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
              const fallbackThreadId = threads.find((thread) => thread.threadId !== threadId)?.threadId ?? null
              activeThreadIdRef.current = fallbackThreadId
              setActiveThreadId(fallbackThreadId)
            }
          }}
          onUnarchiveThread={async (threadId) => {
            await unarchiveThread({ threadId })
            activeThreadIdRef.current = threadId
            setActiveThreadId(threadId)
          }}
          quota={quota}
          canLoadMore={threadPageStatus === "CanLoadMore"}
          onLoadMore={() => loadMoreThreads(30)}
          canLoadMoreArchived={archivedPageStatus === "CanLoadMore"}
          onLoadMoreArchived={() => loadMoreArchivedThreads(20)}
        />
        <AskAIThread
          threadsOpen={threadsOpen}
          onToggleThreads={() => setThreadsOpen((open) => !open)}
          threadId={resolvedActiveThreadId}
          messagesRemaining={quota ? Math.max(0, quota.limit - quota.used) : null}
          loading={
            threadPageStatus === "LoadingFirstPage" ||
            (Boolean(resolvedActiveThreadId) && messagePageStatus === "LoadingFirstPage")
          }
          usage={
            richPartsByMessage.get(
              messageResults.findLast(
                (message) => message.role === "assistant" && Boolean(richPartsByMessage.get(message.id)?.usage),
              )?.id ?? "",
            )?.usage
          }
          canLoadMoreMessages={messagePageStatus === "CanLoadMore"}
          onLoadMoreMessages={() => loadMoreMessages(50)}
          queue={(turnQueue ?? []).filter((turn) => turn.status === "queued" && String(turn.id) !== pendingTurn?.id)}
          runningPrompt={pendingTurn?.error ? undefined : pendingTurn?.prompt}
          messages={messages}
          onRetry={async () => {
            if (!pendingTurn?.error) return
            await retryFailedTurn({ turnId: pendingTurn.id as Id<"askAITurns"> })
            setPendingTurn(null)
          }}
          onSend={sendPrompt}
          onCancelRunning={async () => {
            if (!resolvedActiveThreadId) return
            await cancelRunningTurn({ threadId: resolvedActiveThreadId })
            setPendingTurn(null)
          }}
          onCancelQueued={async (turnId) => {
            await cancelQueuedTurn({ turnId: turnId as Id<"askAITurns"> })
          }}
        />
      </main>
    </AssistantRuntimeProvider>
  )
}
