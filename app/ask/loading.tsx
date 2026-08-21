import { AskAILoadingBody } from "./components/ask-ai-skeleton"

// Mirror the real /ask chrome (sticky header + full-height body) so the route-level
// loading state doesn't jump to a different layout when the page hydrates.
export default function AskAILoading() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 flex h-16 items-center border-b border-border bg-background px-4 sm:px-6 lg:h-[68px] lg:px-5 xl:px-6 2xl:px-8">
        <span className="h-6 w-24 animate-pulse rounded bg-foreground/10" />
        <span className="ml-auto size-11 animate-pulse rounded-full bg-foreground/10" />
      </header>
      <AskAILoadingBody />
    </div>
  )
}
