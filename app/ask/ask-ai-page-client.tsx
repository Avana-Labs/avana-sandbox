"use client"

import {
  AssistantRuntimeProvider,
  type AppendMessage,
  type ThreadMessage,
  useExternalStoreRuntime,
} from "@assistant-ui/react"
import { useMutation, useQuery } from "convex/react"
import { useCallback, useEffect, useState } from "react"
import { api } from "@/convex/_generated/api"
import { AskAIThread } from "./components/ask-ai-thread"
import { AskAIThreadList } from "./components/ask-ai-thread-list"

export function AskAIPageClient() {
  const [threadsOpen, setThreadsOpen] = useState(false)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const threads = useQuery(api.askAI.list, {}) ?? []
  const createThread = useMutation(api.askAI.create)

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return
    const desktop = window.matchMedia("(min-width: 1024px)")
    const syncToViewport = () => setThreadsOpen(desktop.matches)
    syncToViewport()
    desktop.addEventListener("change", syncToViewport)
    return () => desktop.removeEventListener("change", syncToViewport)
  }, [])

  const handleNewThread = useCallback(async () => {
    const thread = await createThread({})
    setActiveThreadId(thread.threadId)
    if (typeof window.matchMedia !== "function" || window.matchMedia("(max-width: 1023px)").matches) {
      setThreadsOpen(false)
    }
  }, [createThread])
  const handleNewMessage = useCallback(async (_message: AppendMessage) => {
    // Commit 3 connects this boundary to Convex Agent. Keeping the assistant-ui
    // runtime in place now means the presentation does not need to be replaced.
  }, [])
  const messages: readonly ThreadMessage[] = []
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
