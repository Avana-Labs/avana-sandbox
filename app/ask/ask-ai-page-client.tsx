"use client"

import {
  AssistantRuntimeProvider,
  type AppendMessage,
  type ThreadMessage,
  useExternalStoreRuntime,
} from "@assistant-ui/react"
import { useCallback, useState } from "react"
import { AskAIThread } from "./components/ask-ai-thread"
import { AskAIThreadList } from "./components/ask-ai-thread-list"

export function AskAIPageClient() {
  const [mobileThreadsOpen, setMobileThreadsOpen] = useState(false)
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
      <main className="mx-auto flex h-[calc(100dvh-64px)] min-h-[620px] w-full max-w-[1600px] overflow-hidden px-3 py-3 sm:px-5 lg:h-[calc(100dvh-68px)] lg:gap-5 lg:px-8 lg:py-5">
        <AskAIThreadList open={mobileThreadsOpen} onClose={() => setMobileThreadsOpen(false)} />
        <AskAIThread onOpenThreads={() => setMobileThreadsOpen(true)} />
      </main>
    </AssistantRuntimeProvider>
  )
}
