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

// Full-height body used before the thread mounts. Header and sidebar use their
// stable loaded shapes. Only the message viewport skeletonizes.
export function AskAILoadingBody() {
  return (
    <main className="flex h-[calc(100dvh-64px)] w-full overflow-hidden lg:h-[calc(100dvh-68px)]">
      <aside aria-hidden className="hidden w-[260px] shrink-0 flex-col bg-muted/20 p-3 lg:flex">
        <div className="flex h-8 items-center gap-2 rounded-md bg-muted px-2.5 text-sm">
          <span className="text-xl font-light leading-none">+</span>
          New Thread
        </div>
        <p className="mt-6 px-2.5 text-xs font-medium text-muted-foreground">Today</p>
        <p className="mt-1 px-2.5 text-sm text-muted-foreground">Loading conversations</p>
      </aside>
      <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <div className="h-16 shrink-0" />
        <AskAIThreadSkeleton />
      </section>
    </main>
  )
}
