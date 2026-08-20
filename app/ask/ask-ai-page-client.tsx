"use client"

import {
  AssistantRuntimeProvider,
  type AppendMessage,
  type ThreadAssistantMessagePart,
  type ThreadMessage,
  useExternalStoreRuntime,
} from "@assistant-ui/react"
import { useMutation, useQuery } from "convex/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { AskAIChatEvent } from "@/app/lib/ask-ai/chat-protocol"
import type { AskAIUsage } from "@/app/lib/ask-ai/chat-protocol"
import { getAskAIGuestToken } from "@/app/lib/ask-ai/guest-auth-store"
import { getSiweToken } from "@/app/lib/siwe/auth-store"
import { api } from "@/convex/_generated/api"
import { AskAIThread } from "./components/ask-ai-thread"
import { AskAIThreadList } from "./components/ask-ai-thread-list"

type StreamTurn = {
  id: string
  prompt: string
  startedAt: number
  text: string
  parts: ThreadAssistantMessagePart[]
  done: boolean
  error?: string
  promptMessageId?: string
  usage?: AskAIUsage
}

type PersistedRichParts = {
  tool?: { name: string; query: string; request: string; result: string }
  retrievalChunks?: unknown[]
  sources?: unknown[]
  visual?: unknown
  usage?: AskAIUsage
}

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
  if (rich?.tool) {
    parts.push({
      type: "tool-call",
      toolCallId: `${messageId}-tool`,
      toolName: rich.tool.name,
      args: { query: rich.tool.query, request: rich.tool.request },
      argsText: JSON.stringify({ query: rich.tool.query, request: rich.tool.request }),
      result: rich.tool.result,
    })
  }
  if (rich?.retrievalChunks?.length) {
    parts.push({
      type: "data",
      name: "retrieval",
      data: { query: rich.tool?.query ?? "Avana", chunks: rich.retrievalChunks },
    })
  }
  if (rich?.sources?.length) parts.push({ type: "data", name: "sources", data: rich.sources })
  if (rich?.visual) parts.push({ type: "data", name: "chart", data: rich.visual })
  parts.push({ type: "text", text })
  return parts
}

export function AskAIPageClient() {
  const [threadsOpen, setThreadsOpen] = useState(false)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [streamTurn, setStreamTurn] = useState<StreamTurn | null>(null)
  const abortController = useRef<AbortController | null>(null)
  const threads = useQuery(api.askAI.list, {}) ?? []
  const quota = useQuery(api.askAI.quota, {})
  const createThread = useMutation(api.askAI.create)
  const messagePage = useQuery(
    api.askAI.messages,
    activeThreadId ? { threadId: activeThreadId, paginationOpts: { numItems: 50, cursor: null } } : "skip",
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
    if (!activeThreadId && threads[0]) setActiveThreadId(threads[0].threadId)
  }, [activeThreadId, threads])
  useEffect(() => () => abortController.current?.abort(), [])

  const persistedMessages = useMemo<ThreadMessage[]>(
    () =>
      (messagePage?.page ?? []).flatMap((message): ThreadMessage[] => {
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
    [messagePage?.page],
  )

  useEffect(() => {
    if (!streamTurn?.done || !streamTurn.text) return
    if (
      persistedMessages.some(
        (message) => message.role === "assistant" && messageText(message).trim() === streamTurn.text.trim(),
      )
    )
      setStreamTurn(null)
  }, [persistedMessages, streamTurn])

  const handleNewThread = useCallback(async () => {
    abortController.current?.abort()
    setStreamTurn(null)
    const thread = await createThread({})
    setActiveThreadId(thread.threadId)
    if (typeof window.matchMedia !== "function" || window.matchMedia("(max-width: 1023px)").matches)
      setThreadsOpen(false)
  }, [createThread])

  const sendPrompt = useCallback(
    async (prompt: string, retryPromptMessageId?: string) => {
      if (!prompt || (streamTurn && !streamTurn.done)) return
      let threadId = activeThreadId
      if (!threadId) {
        const created = await createThread({})
        threadId = created.threadId
        setActiveThreadId(threadId)
      }
      const token = getSiweToken()?.jwt ?? getAskAIGuestToken()?.jwt
      if (!token) throw new Error("Ask AI session is still starting")

      const controller = new AbortController()
      abortController.current = controller
      const turnId = crypto.randomUUID()
      setStreamTurn({ id: turnId, prompt, startedAt: Date.now(), text: "", parts: [], done: false })
      try {
        const response = await fetch("/api/ask-ai/chat", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            threadId,
            prompt,
            retryPromptMessageId,
            messages: persistedMessages.map((item) => ({ role: item.role, text: messageText(item) })),
          }),
          signal: controller.signal,
        })
        if (!response.ok || !response.body) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(payload?.error ?? `Ask AI request failed (${response.status})`)
        }
        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
        let buffer = ""
        while (true) {
          const { value, done } = await reader.read()
          buffer += value ?? ""
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""
          for (const line of lines) {
            if (!line.trim()) continue
            const event = JSON.parse(line) as AskAIChatEvent
            setStreamTurn((current) => {
              if (!current || current.id !== turnId) return current
              if (event.type === "meta")
                return {
                  ...current,
                  promptMessageId: event.promptMessageId,
                  parts: event.tool
                    ? [
                        ...current.parts,
                        {
                          type: "tool-call",
                          toolCallId: `${turnId}-tool`,
                          toolName: event.tool.name,
                          args: { query: event.tool.query, request: event.tool.request },
                          argsText: JSON.stringify({ query: event.tool.query, request: event.tool.request }),
                          result: event.tool.result,
                        },
                      ]
                    : current.parts,
                }
              if (event.type === "retrieval")
                return {
                  ...current,
                  parts: [
                    ...current.parts,
                    { type: "data", name: "retrieval", data: { query: current.prompt, chunks: event.chunks } },
                  ],
                }
              if (event.type === "sources")
                return { ...current, parts: [...current.parts, { type: "data", name: "sources", data: event.sources }] }
              if (event.type === "visual")
                return { ...current, parts: [...current.parts, { type: "data", name: "chart", data: event.visual }] }
              if (event.type === "usage") return { ...current, usage: event.usage }
              if (event.type === "text-delta") {
                const text = current.text + event.delta
                return {
                  ...current,
                  text,
                  parts: [...current.parts.filter((part) => part.type !== "text"), { type: "text", text }],
                }
              }
              if (event.type === "done") return { ...current, done: true }
              if (event.type === "error") return { ...current, done: true, error: event.message }
              return current
            })
          }
          if (done) break
        }
      } catch (error) {
        setStreamTurn((current) =>
          current?.id === turnId
            ? {
                ...current,
                done: true,
                error: controller.signal.aborted
                  ? "Response stopped"
                  : error instanceof Error
                    ? error.message
                    : "Ask AI failed",
              }
            : current,
        )
      } finally {
        if (abortController.current === controller) abortController.current = null
      }
    },
    [activeThreadId, createThread, persistedMessages, streamTurn],
  )

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

  const messages = useMemo<readonly ThreadMessage[]>(() => {
    if (!streamTurn) return persistedMessages
    const persistedPrompt = persistedMessages.some(
      (message) =>
        message.role === "user" &&
        (message.createdAt?.getTime() ?? 0) >= streamTurn.startedAt - 2_000 &&
        messageText(message) === streamTurn.prompt,
    )
    const transient: ThreadMessage[] = []
    if (!persistedPrompt)
      transient.push({
        id: `${streamTurn.id}-user`,
        role: "user",
        content: [{ type: "text", text: streamTurn.prompt }],
        attachments: [],
        createdAt: new Date(streamTurn.startedAt),
        metadata: { custom: {} },
      })
    transient.push({
      id: `${streamTurn.id}-assistant`,
      role: "assistant",
      content: streamTurn.parts,
      status: streamTurn.error
        ? { type: "incomplete", reason: "error", error: streamTurn.error }
        : streamTurn.done
          ? { type: "complete", reason: "stop" }
          : { type: "running" },
      createdAt: new Date(streamTurn.startedAt + 1),
      metadata: assistantMetadata(),
    })
    return [...persistedMessages, ...transient]
  }, [persistedMessages, streamTurn])

  const runtime = useExternalStoreRuntime({
    messages,
    isRunning: Boolean(streamTurn && !streamTurn.done),
    onNew: handleNewMessage,
    onCancel: async () => abortController.current?.abort(),
    onReload: async () => {
      if (!streamTurn?.error) return
      await sendPrompt(streamTurn.prompt, streamTurn.promptMessageId)
    },
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
          activeThreadId={activeThreadId}
          threads={threads}
          onClose={() => setThreadsOpen(false)}
          onNewThread={handleNewThread}
          onSelectThread={(threadId) => {
            abortController.current?.abort()
            setStreamTurn(null)
            setActiveThreadId(threadId)
          }}
          quota={quota}
        />
        <AskAIThread
          title={threads.find((thread) => thread.threadId === activeThreadId)?.title ?? "New Chat"}
          threadsOpen={threadsOpen}
          onToggleThreads={() => setThreadsOpen((open) => !open)}
          threadId={activeThreadId}
          usage={
            streamTurn?.usage ??
            (
              (messagePage?.page ?? []).findLast(
                (message) =>
                  message.role === "assistant" && Boolean((message.richParts as PersistedRichParts | undefined)?.usage),
              )?.richParts as PersistedRichParts | undefined
            )?.usage
          }
        />
      </main>
    </AssistantRuntimeProvider>
  )
}
