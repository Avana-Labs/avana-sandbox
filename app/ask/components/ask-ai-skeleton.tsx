"use client"

// Animated message-shaped skeleton shown while the thread's messages load, so reopening Ask AI
// reveals a shimmer (not a flash of the empty state or a blank panel) before content resolves.
export function AskAIThreadSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[44rem] flex-1 flex-col gap-7 px-4 pt-10" aria-hidden>
      <span className="ml-auto block h-8 w-[38%] animate-pulse rounded-2xl bg-foreground/10" />
      <div className="space-y-2.5">
        <span className="block h-3.5 w-[72%] animate-pulse rounded-full bg-foreground/10" />
        <span className="block h-3.5 w-[58%] animate-pulse rounded-full bg-foreground/10" />
        <span className="block h-3.5 w-[44%] animate-pulse rounded-full bg-foreground/10" />
      </div>
      <span className="ml-auto block h-8 w-[30%] animate-pulse rounded-2xl bg-foreground/10" />
      <div className="space-y-2.5">
        <span className="block h-3.5 w-[64%] animate-pulse rounded-full bg-foreground/10" />
        <span className="block h-3.5 w-[50%] animate-pulse rounded-full bg-foreground/10" />
      </div>
    </div>
  )
}

// Full-height body used before the thread mounts (hydration gate + guest-session boot). Matches the
// real `<main>` layout — including the desktop sidebar column — so every loading phase shows the same
// header + sidebar chrome and only the message area shimmers. No jump when the live thread replaces it.
export function AskAILoadingBody() {
  return (
    <main className="flex h-[calc(100dvh-64px)] w-full overflow-hidden lg:h-[calc(100dvh-68px)]">
      <aside aria-hidden className="hidden shrink-0 flex-col gap-2 bg-muted/20 p-3 lg:flex lg:w-[260px]">
        <span className="h-9 w-full animate-pulse rounded-lg bg-foreground/10" />
        <span className="mb-1 mt-3 h-3 w-14 animate-pulse rounded bg-foreground/10" />
        {Array.from({ length: 5 }).map((_, index) => (
          <span key={index} className="h-8 w-full animate-pulse rounded-md bg-foreground/[0.06]" />
        ))}
      </aside>
      <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <div className="h-16 shrink-0" />
        <AskAIThreadSkeleton />
      </section>
    </main>
  )
}
