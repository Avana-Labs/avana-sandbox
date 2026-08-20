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
import { AskAIThread } from "./components/ask-ai-thread"
import { AskAIThreadList } from "./components/ask-ai-thread-list"

type PendingTurn = {
  id: string
  prompt: string
  startedAt: number
  error?: string
}

type PersistedRichParts = {
  tool?: { name: string; query: string; request: string; result: string }
  retrievalChunks?: unknown[]
  sources?: unknown[]
  visual?: unknown
  financialResult?: unknown
  usage?: AskAIUsage
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
      data: { query: rich.tool?.query ?? "Avana", chunks: rich.retrievalChunks },
    })
  }
  if (rich?.sources?.length) parts.push({ type: "data", name: "sources", data: rich.sources })
  if (rich?.visual) parts.push({ type: "data", name: "chart", data: rich.visual })
  if (rich?.financialResult) parts.push({ type: "data", name: "financial-result", data: rich.financialResult })
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
              status: message.status === "streaming" ? { type: "running" } : { type: "complete", reason: "stop" },
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
          current?.id === turnId
            ? { ...current, error: error instanceof Error ? error.message : "Ask AI failed" }
            : current,
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
    suggestions: [
      { prompt: "How much can I borrow?" },
      { prompt: "Analyze my positions" },
      { prompt: "What is my health factor?" },
      { prompt: "What if ETH falls 20%?" },
      { prompt: "Explain LP collateral" },
      { prompt: "Find ETH/USDC markets" },
    ],
  })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <main className="flex h-[calc(100dvh-64px)] min-h-[620px] w-full overflow-hidden lg:h-[calc(100dvh-68px)]">
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
