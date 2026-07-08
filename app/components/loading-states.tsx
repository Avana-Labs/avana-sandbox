import type { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * Client-gated loading skeletons.
 *
 * These are shown only while a page's client-side data genuinely isn't ready yet
 * (the home workspace waiting on the session, rewards waiting on hydrated storage)
 * — NOT as route-level `loading.tsx` fallbacks, which flashed on every navigation.
 * Normal page-to-page transitions are handled by the top progress bar
 * (`app/components/page-loading-bar.tsx`).
 *
 * Guiding rule: each skeleton is a structural stand-in, not decoration. Its wrapper
 * (width, padding, alignment) and block layout (section order, card counts, heights,
 * grid columns) mirror the real page so the content reveals in place with no shift.
 */

type BlockProps = {
  children: ReactNode
  className?: string
}

/**
 * Shared page shell. The width + padding here must match the real route so the
 * loaded page reveals in place with no shift: rewards wraps content in
 * `mx-auto max-w-[1152px]` under a `container mx-auto px-4` main. `mainClassName`
 * lets the route override the padding to match its own main.
 */
function Page({ children, className, mainClassName }: BlockProps & { mainClassName?: string }) {
  return (
    // A single polite status region announces the load once; the placeholder blocks inside
    // are decorative (aria-hidden) so assistive tech isn't dragged across empty rectangles.
    <div className="bg-background" role="status" aria-busy="true" aria-live="polite" aria-label="Loading">
      <span className="sr-only">Loading…</span>
      <main className={cn("container mx-auto", mainClassName ?? "px-4 py-8")}>
        <div className={cn("skeleton-enter mx-auto max-w-[1152px]", className)}>{children}</div>
      </main>
    </div>
  )
}

/** Mirrors the borderless product cards (`bg-card`, no border/shadow). */
function Surface({ children, className }: BlockProps) {
  return <section className={cn("rounded-radius-md border-0 bg-card shadow-none", className)}>{children}</section>
}

// -----------------------------------------------------------------------------
// home (`/`) — the express workspace card: a centered `max-w-[480px]` column with
// a mode-tab row, a collateral→amount swap-style field stack, and a primary CTA.
// This mirrors `HomeWorkspaceCard` + the embedded borrow action 1:1 (same wrapper
// alignment, padding, field boxes and heights) so the real card reveals in place
// with no jump. It is NOT wrapped in `Page` — the home layout is its own shell.
// -----------------------------------------------------------------------------

/** One swap-style field box (collateral / amount) — matches `SwapStyleField`. */
function HomeFieldSkeleton({ children }: { children: ReactNode }) {
  return <div className="rounded-radius-xl border border-border/60 bg-surface-inset px-4 py-3">{children}</div>
}

export function HomeWorkspaceSkeleton() {
  return (
    // Keep the loading testid on the root so the initial-HTML shell assertion in
    // tests/e2e/route-performance.spec.ts still finds it.
    <div
      className="bg-background"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading"
      data-testid="home-workspace-loading"
    >
      <span className="sr-only">Loading…</span>
      <section className="skeleton-enter flex min-h-[calc(100dvh-4rem)] justify-center px-4 pb-12 pt-16 md:pb-16 md:pt-24">
        <div className="w-full max-w-[480px]">
          {/* header: mode tab strip */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-0.5 sm:gap-1">
              {["w-14", "w-14", "w-12", "w-16"].map((width, index) => (
                <Skeleton key={`home-mode-${index}`} className={cn("h-7 rounded-full", width)} />
              ))}
            </div>
          </div>

          {/* collateral → amount field stack + primary CTA */}
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <HomeFieldSkeleton>
                <Skeleton className="h-4 w-24 rounded-xs" />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <Skeleton className="h-8 w-28 rounded-xs" />
                  <Skeleton className="h-9 w-16 rounded-full" />
                </div>
                <Skeleton className="mt-2 h-4 w-16 rounded-xs" />
              </HomeFieldSkeleton>

              {/* directional affordance between the two fields (decorative) */}
              <div aria-hidden className="relative z-10 -my-3 flex justify-center">
                <span className="flex size-7 items-center justify-center rounded-radius-md border-4 border-background bg-surface-inset">
                  <Skeleton className="size-3.5 rounded-full" />
                </span>
              </div>

              <HomeFieldSkeleton>
                <Skeleton className="h-4 w-16 rounded-xs" />
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <Skeleton className="h-8 w-24 rounded-xs" />
                  <Skeleton className="h-9 w-20 rounded-full" />
                </div>
                <Skeleton className="mt-1 h-4 w-20 rounded-xs" />
                <Skeleton className="mt-1.5 h-3 w-32 rounded-xs" />
              </HomeFieldSkeleton>
            </div>

            <Skeleton className="mt-1 h-14 w-full rounded-radius-xl" />
          </div>
        </div>
      </section>
    </div>
  )
}

// -----------------------------------------------------------------------------
// rewards (`/rewards`) — balance hero + underline tabs + quest grid. Shown by the
// rewards client while storage hydrates / the snapshot loads.
// -----------------------------------------------------------------------------

export function RewardsPageSkeleton() {
  return (
    <Page mainClassName="px-3 py-6 sm:px-4 md:py-10">
      {/* Balance hero (left) + promo card (right, md+) — RewardsBalanceHero. */}
      <div className="mb-6 grid gap-5 md:mb-8 md:gap-7 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)] xl:items-start">
        <Surface className="px-4 py-4 sm:px-5 md:min-h-[174px]">
          <div className="flex min-h-[142px] flex-col justify-between gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-32 rounded-xs" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <Skeleton className="h-3 w-24 rounded-xs" />
                <Skeleton className="h-3 w-28 rounded-xs" />
              </div>
              <Skeleton className="h-10 w-28 rounded-radius-sm" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-48 rounded-xs" />
              <Skeleton className="h-1.5 w-full rounded-xs" />
            </div>
          </div>
        </Surface>

        <Surface className="hidden p-4 md:block">
          <Skeleton className="mb-3 h-3.5 w-28 rounded-xs" />
          <div className="space-y-3.5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`rewards-promo-row-${index}`} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-24 rounded-xs" />
                    <Skeleton className="h-2.5 w-14 rounded-xs" />
                  </div>
                </div>
                <Skeleton className="h-3.5 w-12 rounded-xs" />
              </div>
            ))}
          </div>
        </Surface>
      </div>

      {/* Underline tab strip (left-aligned, border-b) — RewardsTabs. */}
      <div className="mb-6 border-b border-border/90">
        <div className="flex gap-6 pb-3 sm:gap-9 sm:pb-4">
          {["w-20", "w-24", "w-20"].map((width, index) => (
            <Skeleton key={`rewards-tab-${index}`} className={cn("h-4 rounded-xs", width)} />
          ))}
        </div>
      </div>

      {/* Quest grid — QuestsTab: h-full cards with icon + badge, title block, and a
          bottom CTA, laid out 1 → 2 → 4 → 5 columns. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 8 }).map((_, index) => (
          <Surface key={`rewards-quest-${index}`} className="flex h-full flex-col p-3.5">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-9 w-9 rounded-radius-md" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <div className="mt-3 space-y-2 sm:mt-3.5">
              <Skeleton className="h-3.5 w-full rounded-xs" />
              <Skeleton className="h-3.5 w-4/5 rounded-xs" />
              <Skeleton className="h-3 w-2/3 rounded-xs" />
              <Skeleton className="h-3.5 w-20 rounded-xs" />
            </div>
            <div className="mt-auto pt-3.5">
              <Skeleton className="h-9 w-full rounded-radius-sm" />
            </div>
          </Surface>
        ))}
      </div>
    </Page>
  )
}
