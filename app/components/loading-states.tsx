import type { ReactNode } from "react"
import { Skeleton, SkeletonText } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * Per-route loading skeletons.
 *
 * Guiding rules (Microsoft/Fluent-style):
 * - No decorative outer wrapper cards. Each skeleton mirrors its page's real
 *   layout so the transition into the loaded page is structural, not cosmetic.
 * - Only actual surfaces (cards, tables, panels) render a `Surface`. Hero rows,
 *   section headers, and form rails render as bare blocks with disciplined spacing.
 * - Surfaces use the same tokens as the live UI: `border border-border`,
 *   `bg-surface-raised`, `rounded-radius-md`, `shadow-elev-1`.
 * - Radii ladder: bars/pills use `rounded-xs` (4px), fields `rounded-radius-sm`
 *   (6px), cards `rounded-radius-md` (8px). No `rounded-full` placeholders.
 */

// -----------------------------------------------------------------------------
// shared primitives
// -----------------------------------------------------------------------------

type BlockProps = {
  children: ReactNode
  className?: string
}

function Page({ children, className }: BlockProps) {
  return (
    // A single polite status region announces the load once; the placeholder blocks inside
    // are decorative (aria-hidden) so assistive tech isn't dragged across empty rectangles.
    <div className="bg-background" role="status" aria-busy="true" aria-live="polite" aria-label="Loading">
      <span className="sr-only">Loading…</span>
      <main className="container mx-auto px-4 py-8">
        <div className={cn("skeleton-enter mx-auto max-w-5xl", className)}>{children}</div>
      </main>
    </div>
  )
}

function Surface({ children, className }: BlockProps) {
  return <section className={cn("rounded-radius-md border-0 bg-card shadow-none", className)}>{children}</section>
}

function Inset({ children, className }: BlockProps) {
  return <div className={cn("rounded-radius-sm border border-border bg-surface-inset", className)}>{children}</div>
}

/** Compact balance hero line — matches the `text-[10.5px] uppercase` + `$28px` pattern. */
function BalanceHeroSkeleton({ actionCount = 2 }: { actionCount?: number }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-3 w-32 rounded-xs" />
        <div className="flex items-baseline gap-3">
          <Skeleton className="h-7 w-48 rounded-xs" />
          <Skeleton className="h-3.5 w-28 rounded-xs" />
        </div>
      </div>
      {actionCount > 0 ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: actionCount }).map((_, index) => (
            <Skeleton key={`hero-action-${index}`} className="h-8 w-28 rounded-radius-sm" />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function SectionHeader({ titleWidth = "w-40", metaWidth }: { titleWidth?: string; metaWidth?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <Skeleton className={cn("h-3 rounded-xs", titleWidth)} />
      {metaWidth ? <Skeleton className={cn("h-3 rounded-xs", metaWidth)} /> : null}
    </div>
  )
}

function ProgressRow() {
  return (
    <div className="mb-8">
      <div className="mb-2 flex items-center justify-between">
        <Skeleton className="h-3 w-28 rounded-xs" />
        <Skeleton className="h-3 w-20 rounded-xs" />
      </div>
      <Skeleton className="h-1.5 w-full rounded-xs" />
    </div>
  )
}

function MarketHeroSkeleton({ primaryWidth = "w-28" }: { primaryWidth?: string }) {
  return (
    <div className="mb-4 flex flex-col gap-4 px-1 pb-4 md:flex-row md:items-end md:justify-between md:px-2">
      <div className="flex items-baseline gap-3">
        <Skeleton className="h-3 w-20 rounded-xs" />
        <Skeleton className={cn("h-7 rounded-xs", primaryWidth)} />
      </div>
      <div className="grid grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="space-y-2 md:text-right" key={`market-hero-${index}`}>
            <Skeleton className="h-2.5 w-20 rounded-xs" />
            <Skeleton className="h-4 w-14 rounded-xs md:ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Real market names/values differ in length; varying the placeholder widths per row (rather
// than a rigid identical grid) reads as data rather than a template — the "vary widths"
// guidance from Marina Aisa's skeleton-screens article. Index-derived so SSR/client match.
const ROW_NAME_WIDTHS = ["w-32", "w-24", "w-28", "w-36", "w-24", "w-28", "w-20"]
const ROW_SUB_WIDTHS = ["w-20", "w-16", "w-24", "w-16", "w-24", "w-20", "w-16"]

function MarketTableSkeleton({ prefix, rows = 6 }: { prefix: string; rows?: number }) {
  return (
    <Surface>
      <div className="flex items-center gap-4 border-b border-border px-5 py-3.5">
        {[`flex-1`, `w-16`, `w-20`, `w-16`, `w-20`].map((width, index) => (
          <Skeleton key={`${prefix}-head-${index}`} className={cn("h-2.5 rounded-xs", width)} />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, index) => (
          <div className="flex min-h-16 items-center gap-4 px-5 py-3" key={`${prefix}-row-${index}`}>
            <div className="relative h-8 w-12 shrink-0">
              <Skeleton className="absolute left-0 size-8 rounded-full" />
              <Skeleton className="absolute left-5 size-8 rounded-full" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className={cn("h-3 rounded-xs", ROW_NAME_WIDTHS[index % ROW_NAME_WIDTHS.length])} />
              <Skeleton className={cn("h-2.5 rounded-xs", ROW_SUB_WIDTHS[index % ROW_SUB_WIDTHS.length])} />
            </div>
            <Skeleton className="hidden h-3 w-14 rounded-xs sm:block" />
            <Skeleton className="hidden h-3 w-16 rounded-xs md:block" />
            <Skeleton className="h-8 w-20 rounded-radius-sm" />
          </div>
        ))}
      </div>
    </Surface>
  )
}

function ListRow({ avatar = false, trailing = false }: { avatar?: boolean; trailing?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {avatar ? <Skeleton className="h-7 w-7 rounded-xs" /> : null}
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3 w-40 max-w-full rounded-xs" />
        <Skeleton className="h-2.5 w-24 rounded-xs" />
      </div>
      {trailing ? <Skeleton className="h-6 w-16 rounded-radius-sm" /> : null}
    </div>
  )
}

// -----------------------------------------------------------------------------
// home (`/`) — mode tabs + left action card + right preview panel
// -----------------------------------------------------------------------------

export function HomePageSkeleton() {
  return (
    <Page>
      <div className="mb-6 flex justify-center">
        <div className="inline-flex gap-1 rounded-radius-sm border border-border bg-surface-inset p-1">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`mode-${index}`} className="h-7 w-20 rounded-xs" />
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]">
        <Surface className="p-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32 rounded-xs" />
              <Skeleton className="h-6 w-6 rounded-xs" />
            </div>
            <Inset className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-16 rounded-xs" />
                <Skeleton className="h-3 w-20 rounded-xs" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-7 w-28 rounded-xs" />
                <Skeleton className="h-7 w-20 rounded-radius-sm" />
              </div>
            </Inset>
            <Inset className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20 rounded-xs" />
                <Skeleton className="h-3 w-24 rounded-xs" />
              </div>
              <Skeleton className="h-7 w-full rounded-xs" />
            </Inset>
            <Skeleton className="h-9 w-full rounded-radius-sm" />
          </div>
        </Surface>

        <Surface className="p-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 rounded-xs" />
              <Skeleton className="h-5 w-40 rounded-xs" />
            </div>
            <Skeleton className="h-px w-full" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`preview-row-${index}`} className="flex items-center justify-between">
                  <Skeleton className="h-3 w-28 rounded-xs" />
                  <Skeleton className="h-3 w-20 rounded-xs" />
                </div>
              ))}
            </div>
            <Skeleton className="h-24 w-full rounded-radius-sm" />
          </div>
        </Surface>
      </div>
    </Page>
  )
}

// -----------------------------------------------------------------------------
// borrow (`/borrow`) — tabs bar + pools table + metric strip
// -----------------------------------------------------------------------------

export function BorrowPageSkeleton() {
  return (
    <Page>
      <MarketHeroSkeleton primaryWidth="w-32" />

      <div className="mb-6 space-y-3 px-1 md:px-2">
        <Skeleton className="h-6 w-24 rounded-xs" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <Surface className="h-[142px] min-w-[300px] flex-1 p-4" key={`borrow-explore-${index}`}>
              <div className="flex items-center gap-3">
                <div className="relative h-9 w-14">
                  <Skeleton className="absolute left-0 size-9 rounded-full" />
                  <Skeleton className="absolute left-5 size-9 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-28 rounded-xs" />
                  <Skeleton className="h-2.5 w-20 rounded-xs" />
                </div>
              </div>
              <div className="mt-6 flex justify-between">
                <Skeleton className="h-4 w-20 rounded-xs" />
                <Skeleton className="h-4 w-16 rounded-xs" />
              </div>
            </Surface>
          ))}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36 rounded-radius-sm" />
          <Skeleton className="h-10 w-24 rounded-radius-sm" />
        </div>
        <Skeleton className="h-10 w-10 rounded-radius-sm" />
      </div>
      <MarketTableSkeleton prefix="borrow" />
    </Page>
  )
}

// -----------------------------------------------------------------------------
// lend (`/lend`) — hero + hot markets strip + explore grid + table
// -----------------------------------------------------------------------------

export function LendPageSkeleton() {
  return (
    <Page>
      <MarketHeroSkeleton primaryWidth="w-28" />

      <div className="mt-12">
        <SectionHeader titleWidth="w-28" />
      </div>
      <div className="mb-10 flex gap-4 overflow-hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <Surface key={`lend-hot-${index}`} className="h-[228px] min-w-[300px] flex-1 p-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-12 rounded-full" />
                  <Skeleton className="h-3 w-20 rounded-xs" />
                </div>
                <Skeleton className="h-4 w-10 rounded-xs" />
              </div>
              <Skeleton className="h-6 w-20 rounded-xs" />
              <Skeleton className="mt-8 h-20 w-full rounded-radius-sm" />
            </div>
          </Surface>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <Skeleton className="h-10 w-52 rounded-radius-sm" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-radius-sm" />
          <Skeleton className="h-10 w-10 rounded-radius-sm" />
        </div>
      </div>
      <MarketTableSkeleton prefix="lend" rows={7} />
    </Page>
  )
}

// -----------------------------------------------------------------------------
// multiply (`/multiply`) — balance row + chart + markets table + account tabs
// -----------------------------------------------------------------------------

export function MultiplyPageSkeleton() {
  return (
    <Page>
      <MarketHeroSkeleton primaryWidth="w-32" />

      <div className="mb-8 mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Surface className="h-[174px] p-4" key={`multiply-trending-${index}`}>
            <div className="flex items-start justify-between">
              <div className="relative h-10 w-16">
                <Skeleton className="absolute left-0 size-10 rounded-full" />
                <Skeleton className="absolute left-6 size-10 rounded-full" />
              </div>
              <Skeleton className="h-8 w-14 rounded-full" />
            </div>
            <Skeleton className="mt-5 h-3 w-24 rounded-xs" />
            <div className="mt-5 space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-2.5 w-12 rounded-xs" />
                <Skeleton className="h-3 w-14 rounded-xs" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-2.5 w-16 rounded-xs" />
                <Skeleton className="h-3 w-16 rounded-xs" />
              </div>
            </div>
          </Surface>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <Skeleton className="h-10 w-52 rounded-radius-sm" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-radius-sm" />
          <Skeleton className="h-10 w-10 rounded-radius-sm" />
        </div>
      </div>
      <MarketTableSkeleton prefix="multiply" rows={7} />
    </Page>
  )
}

// -----------------------------------------------------------------------------
// rewards (`/rewards`) — balance hero + overall progress + quest grid
// -----------------------------------------------------------------------------

export function RewardsPageSkeleton() {
  return (
    <Page>
      <div className="mb-8 grid gap-7 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
        <Surface className="rounded-radius-lg px-5 py-4 shadow-none">
          <div className="flex min-h-[168px] flex-col justify-between gap-4">
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
              <Skeleton className="h-3 w-56 rounded-xs" />
            </div>
          </div>
        </Surface>

        <div className="space-y-4">
          <Skeleton className="h-4 w-36 rounded-xs" />

          {Array.from({ length: 2 }).map((_, index) => (
            <Surface key={`rewards-hero-row-${index}`} className="rounded-radius-md p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-11 w-11 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-3.5 w-28 rounded-xs" />
                    <Skeleton className="h-3 w-16 rounded-xs" />
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <Skeleton className="h-3.5 w-16 rounded-xs" />
                  <Skeleton className="h-3 w-12 rounded-xs" />
                </div>
              </div>
            </Surface>
          ))}
        </div>
      </div>

      <div className="mb-6 flex justify-center">
        <div className="inline-flex gap-1 rounded-radius-sm border border-border bg-surface-inset p-1">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={`rewards-tab-${index}`} className="h-7 w-20 rounded-xs" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Surface key={`rewards-chain-${index}`} className="p-5">
            <div className="space-y-3.5">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-7 w-7 rounded-xs" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-24 rounded-xs" />
                  <Skeleton className="h-2.5 w-16 rounded-xs" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-2.5 w-20 rounded-xs" />
                  <Skeleton className="h-2.5 w-16 rounded-xs" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-xs" />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((__, cellIndex) => (
                  <Skeleton key={`rewards-cell-${index}-${cellIndex}`} className="aspect-square rounded-xs" />
                ))}
              </div>
            </div>
          </Surface>
        ))}
      </div>
    </Page>
  )
}

/** Rendered by `dynamic()` when switching into the rewards → Markets tab. */
export function RewardsMarketsTabSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Surface key={`rewards-markets-${index}`} className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24 rounded-xs" />
              <Skeleton className="h-4 w-12 rounded-xs" />
            </div>
            <Skeleton className="h-6 w-16 rounded-xs" />
            <Skeleton className="h-16 w-full rounded-radius-sm" />
          </div>
        </Surface>
      ))}
    </div>
  )
}

/** Rendered by `dynamic()` when switching into the rewards → Resources tab. */
export function RewardsResourcesTabSkeleton() {
  return (
    <Surface>
      <div className="flex items-center gap-4 border-b border-border px-4 py-2.5">
        {[`flex-1`, `w-14`, `w-16`, `w-16`].map((w, index) => (
          <Skeleton key={`rewards-resources-th-${index}`} className={cn("h-2.5 rounded-xs", w)} />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 5 }).map((_, index) => (
          <ListRow key={`rewards-resources-row-${index}`} trailing />
        ))}
      </div>
    </Surface>
  )
}

// -----------------------------------------------------------------------------
// dashboard (`/dashboard`) — balance hero + amber notice + progress + wizard grid
// -----------------------------------------------------------------------------

export function StakePageSkeleton() {
  return (
    <Page>
      <BalanceHeroSkeleton actionCount={2} />

      <div className="mb-8 rounded-radius-md border border-amber-500/25 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="mt-0.5 h-4 w-4 rounded-xs" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-32 rounded-xs" />
            <SkeletonText lines={2} className="max-w-xl" />
          </div>
        </div>
      </div>

      <ProgressRow />

      <div className="grid gap-8 md:grid-cols-7">
        <div className="space-y-6 md:col-span-5">
          <Skeleton className="h-4 w-52 rounded-xs" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <Surface key={`stake-pool-${index}`} className="p-3.5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-20 rounded-xs" />
                    <Skeleton className="h-3 w-10 rounded-xs" />
                  </div>
                  <Skeleton className="h-4 w-24 rounded-xs" />
                  <Skeleton className="h-7 w-20 rounded-xs" />
                  <Skeleton className="h-8 w-full rounded-radius-sm" />
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1.5">
                      <Skeleton className="h-2.5 w-10 rounded-xs" />
                      <Skeleton className="h-3 w-14 rounded-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <Skeleton className="h-2.5 w-16 rounded-xs" />
                      <Skeleton className="h-3 w-14 rounded-xs" />
                    </div>
                  </div>
                </div>
              </Surface>
            ))}
          </div>
          <div className="flex justify-between pt-4">
            <Skeleton className="h-9 w-20 rounded-radius-sm" />
            <Skeleton className="h-9 w-28 rounded-radius-sm" />
          </div>
        </div>

        <div className="space-y-4 md:col-span-2">
          <Surface className="p-5">
            <div className="space-y-3">
              <Skeleton className="h-3 w-16 rounded-xs" />
              <Skeleton className="h-3 w-full rounded-xs" />
              <div className="space-y-2 pt-1">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={`stake-copilot-${index}`} className="flex items-center gap-2">
                    <Skeleton className="h-3 w-3 rounded-xs" />
                    <Skeleton className="h-2.5 flex-1 rounded-xs" />
                  </div>
                ))}
              </div>
            </div>
          </Surface>
          <Surface className="p-5">
            <div className="space-y-3">
              <Skeleton className="h-3 w-20 rounded-xs" />
              <Inset className="space-y-1.5 p-3">
                <Skeleton className="h-3 w-20 rounded-xs" />
                <Skeleton className="h-2.5 w-28 rounded-xs" />
              </Inset>
              <Inset className="space-y-1.5 p-3">
                <Skeleton className="h-3 w-20 rounded-xs" />
                <Skeleton className="h-2.5 w-28 rounded-xs" />
              </Inset>
            </div>
          </Surface>
        </div>
      </div>
    </Page>
  )
}

// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------

export function RiskWarningPageSkeleton() {
  return (
    <Page>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-40 rounded-xs" />
        <Skeleton className="h-3 w-48 rounded-xs" />
      </div>

      <div className="mb-8 rounded-radius-md border border-amber-500/25 bg-amber-500/5 p-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-64 rounded-xs" />
          <SkeletonText lines={2} />
        </div>
      </div>

      <Skeleton className="mb-4 h-5 w-24 rounded-xs" />
      <Surface className="mb-8">
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={`risk-item-${index}`} className="flex items-center justify-between px-4 py-3">
              <Skeleton className="h-3 w-full max-w-md rounded-xs" />
              <Skeleton className="h-3 w-3 rounded-xs" />
            </div>
          ))}
        </div>
      </Surface>

      <div className="mb-8 grid gap-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <Surface key={`risk-cat-${index}`} className="p-5">
            <div className="space-y-3">
              <Skeleton className="h-3 w-40 rounded-xs" />
              <Skeleton className="h-2.5 w-full rounded-xs" />
              <Skeleton className="h-2.5 w-4/5 rounded-xs" />
              <Skeleton className="h-2.5 w-3/4 rounded-xs" />
            </div>
          </Surface>
        ))}
      </div>

      <Surface className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-48 rounded-xs" />
            <Skeleton className="h-2.5 w-full max-w-lg rounded-xs" />
            <Skeleton className="h-2.5 w-4/5 max-w-md rounded-xs" />
          </div>
          <Skeleton className="h-9 w-44 rounded-radius-sm" />
        </div>
      </Surface>
    </Page>
  )
}

// -----------------------------------------------------------------------------
// market detail (`/*/markets/[id]`, `/borrow/pool|asset/[id]`) — hero + stacked
// analytics sections. Shared by every product's detail route boundary.
// -----------------------------------------------------------------------------

export function MarketDetailSkeleton() {
  return (
    <Page>
      <MarketHeroSkeleton primaryWidth="w-40" />
      <div className="mt-8 space-y-8">
        <Skeleton className="h-5 w-40 rounded-xs" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Surface className="h-24 p-4" key={`detail-stat-${index}`}>
              <Skeleton className="h-2.5 w-16 rounded-xs" />
              <Skeleton className="mt-3 h-5 w-20 rounded-xs" />
            </Surface>
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, index) => (
          <Surface className="h-56 p-5" key={`detail-section-${index}`}>
            <Skeleton className="h-4 w-40 rounded-xs" />
            <Skeleton className="mt-5 h-36 w-full rounded-radius-sm" />
          </Surface>
        ))}
      </div>
    </Page>
  )
}

// -----------------------------------------------------------------------------
// dashboard (`/dashboard`) — balance hero + tab bar + stacked position tables
// -----------------------------------------------------------------------------

export function DashboardPageSkeleton() {
  return (
    <Page>
      <BalanceHeroSkeleton actionCount={4} />
      <div className="mb-6 flex gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={`dashboard-tab-${index}`} className="h-9 w-28 rounded-radius-sm" />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <Surface className="h-64 p-5" key={`dashboard-table-${index}`}>
            <Skeleton className="h-4 w-40 rounded-xs" />
            <Skeleton className="mt-5 h-44 w-full rounded-radius-sm" />
          </Surface>
        ))}
      </div>
    </Page>
  )
}
