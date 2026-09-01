"use client"

import { Skeleton } from "@/components/ui/skeleton"

export function AskAIHeaderTitleSkeleton() {
  return <Skeleton data-testid="ask-ai-header-skeleton" className="mx-auto h-5 w-24 rounded-full" />
}

// Message-only fallback used after Ask AI has initialized, such as when the user
// switches threads. Initial page loading uses the complete shell below.
export function AskAIThreadSkeleton() {
  return (
    <div data-testid="ask-ai-thread-skeleton" className="flex w-full flex-col gap-7 pt-10" aria-hidden>
      <Skeleton className="ml-auto h-8 w-[38%] rounded-2xl" />
      <div className="space-y-2.5">
        <Skeleton className="h-3.5 w-[72%] rounded-full" />
        <Skeleton className="h-3.5 w-[58%] rounded-full" />
        <Skeleton className="h-3.5 w-[44%] rounded-full" />
      </div>
      <Skeleton className="ml-auto h-8 w-[30%] rounded-2xl" />
      <div className="space-y-2.5">
        <Skeleton className="h-3.5 w-[64%] rounded-full" />
        <Skeleton className="h-3.5 w-[50%] rounded-full" />
      </div>
    </div>
  )
}

/** One stable, layout-matched shell for every initial Ask AI loading stage. */
export function AskAILoadingBody({ emptyThread = false }: { emptyThread?: boolean } = {}) {
  return (
    <main
      data-testid="ask-ai-loading-body"
      aria-label="Loading Ask AI"
      className="flex h-[calc(100dvh-56px)] w-full overflow-hidden lg:h-[calc(100dvh-56px)] [@media(min-height:684px)]:min-h-[620px]"
    >
      <aside aria-hidden className="hidden w-[260px] shrink-0 flex-col bg-muted/20 p-3 lg:flex">
        <Skeleton className="h-8 w-full rounded-md" />
        <div className="mt-6 flex-1 px-2.5">
          <Skeleton className="h-3 w-12 rounded-full" />
          {emptyThread ? (
            <Skeleton className="mt-3 h-4 w-24 rounded-full" />
          ) : (
            <>
              <div className="mt-3 space-y-3.5">
                <Skeleton className="h-4 w-[82%] rounded-full" />
                <Skeleton className="h-4 w-[68%] rounded-full" />
                <Skeleton className="h-4 w-[76%] rounded-full" />
                <Skeleton className="h-4 w-[58%] rounded-full" />
                <Skeleton className="h-4 w-[72%] rounded-full" />
              </div>
              <div className="mt-7 border-t border-border/50 pt-4">
                <Skeleton className="h-3 w-20 rounded-full" />
              </div>
            </>
          )}
        </div>
        <div className="rounded-xl border border-border/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-3 w-20 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-1.5 w-full rounded-full" />
          <div className="mt-3 flex items-center justify-between gap-3">
            <Skeleton className="h-3 w-16 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
        </div>
      </aside>

      <section aria-hidden className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <div className="flex h-16 shrink-0 items-center px-5 sm:px-8">
          <Skeleton className="size-8 rounded-md" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="relative flex flex-1 flex-col overflow-hidden">
            <div className="mx-auto flex w-full max-w-[44rem] flex-1 flex-col px-4 pt-4">
              {emptyThread ? (
                <div data-testid="ask-ai-empty-thread-skeleton" className="flex flex-1 flex-col justify-center pb-6">
                  <Skeleton className="mx-auto mb-7 h-7 w-56 rounded-full" />
                </div>
              ) : (
                <AskAIThreadSkeleton />
              )}
              <div className="mt-auto space-y-4 bg-background pb-4 md:pb-6">
                <Skeleton className="h-[106px] w-full rounded-3xl" />
                <div className="mx-auto flex w-[78%] gap-2">
                  <Skeleton className="h-8 flex-1 rounded-full" />
                  <Skeleton className="h-8 flex-1 rounded-full" />
                  <Skeleton className="h-8 flex-1 rounded-full" />
                  <Skeleton className="h-8 flex-1 rounded-full" />
                  <Skeleton className="h-8 flex-1 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
