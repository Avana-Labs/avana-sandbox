"use client"

import {
  AssistantRuntimeProvider,
  type AppendMessage,
  type ThreadMessage,
  useExternalStoreRuntime,
} from "@assistant-ui/react"
import { useMutation, useQuery } from "convex/react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { api } from "@/convex/_generated/api"
import { AskAIThread } from "./components/ask-ai-thread"
import { AskAIThreadList } from "./components/ask-ai-thread-list"

export function AskAIPageClient() {
  const [threadsOpen, setThreadsOpen] = useState(false)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const threads = useQuery(api.askAI.list, {}) ?? []
  const createThread = useMutation(api.askAI.create)
  const addUserMessage = useMutation(api.askAI.addUserMessage)
  const messagePage = useQuery(
    api.askAI.messages,
    activeThreadId ? { threadId: activeThreadId, paginationOpts: { numItems: 50, cursor: null } } : "skip",
  )

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return
    const desktop = window.matchMedia("(min-width: 1024px)")
    const syncToViewport = () => setThreadsOpen(desktop.matches)
    syncToViewport()
    desktop.addEventListener("change", syncToViewport)
    return () => desktop.removeEventListener("change", syncToViewport)
  }, [])

  useEffect(() => {
    if (!activeThreadId && threads[0]) setActiveThreadId(threads[0].threadId)
  }, [activeThreadId, threads])

  const handleNewThread = useCallback(async () => {
    const thread = await createThread({})
    setActiveThreadId(thread.threadId)
    if (typeof window.matchMedia !== "function" || window.matchMedia("(max-width: 1023px)").matches) {
      setThreadsOpen(false)
    }
  }, [createThread])
  const handleNewMessage = useCallback(
    async (message: AppendMessage) => {
      const prompt = message.content
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("\n")
        .trim()
      if (!prompt) return

      let threadId = activeThreadId
      if (!threadId) {
        const created = await createThread({})
        threadId = created.threadId
        setActiveThreadId(threadId)
      }
      await addUserMessage({ threadId, prompt })
    },
    [activeThreadId, addUserMessage, createThread],
  )

  const messages = useMemo<readonly ThreadMessage[]>(
    () =>
      (messagePage?.page ?? []).flatMap((message): ThreadMessage[] => {
        const common = {
          id: message.id,
          content: [{ type: "text" as const, text: message.text }],
          createdAt: new Date(message._creationTime),
        }
        if (message.role === "user") {
          return [{ ...common, role: "user", attachments: [], metadata: { custom: {} } }]
        }
        if (message.role === "assistant") {
          return [
            {
              ...common,
              role: "assistant",
              status: message.status === "streaming" ? { type: "running" } : { type: "complete", reason: "stop" },
              metadata: {
                unstable_state: null,
                unstable_annotations: [],
                unstable_data: [],
                steps: [],
                custom: {},
              },
            },
          ]
        }
        return []
      }),
    [messagePage?.page],
  )
  const runtime = useExternalStoreRuntime({
    messages,
    onNew: handleNewMessage,
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
          onSelectThread={setActiveThreadId}
        />
        <AskAIThread threadsOpen={threadsOpen} onToggleThreads={() => setThreadsOpen((open) => !open)} />
      </main>
    </AssistantRuntimeProvider>
  )
}
