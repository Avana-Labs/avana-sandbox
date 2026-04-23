import type { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
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
    <div className="bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className={cn("mx-auto max-w-5xl", className)}>{children}</div>
      </main>
    </div>
  )
}

function Surface({ children, className }: BlockProps) {
  return (
    <section
      className={cn(
        "rounded-radius-md border border-border bg-surface-raised shadow-elev-1",
        className,
      )}
    >
      {children}
    </section>
  )
}

function Inset({ children, className }: BlockProps) {
  return (
    <div className={cn("rounded-radius-sm border border-border bg-surface-inset", className)}>
      {children}
    </div>
  )
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

function MetricTile() {
  return (
    <div className="space-y-2 p-4">
      <Skeleton className="h-3 w-20 rounded-xs" />
      <Skeleton className="h-5 w-24 rounded-xs" />
    </div>
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
      <div className="mb-6 space-y-3">
        <Skeleton className="h-4 w-44 rounded-xs" />
        <Skeleton className="h-3 w-72 max-w-full rounded-xs" />
      </div>

      <Surface className="mb-6">
        <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
          {Array.from({ length: 3 }).map((_, index) => (
            <MetricTile key={`borrow-metric-${index}`} />
          ))}
        </div>
      </Surface>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-radius-sm border border-border bg-surface-inset p-1">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`borrow-tab-${index}`} className="h-6 w-20 rounded-xs" />
          ))}
        </div>
        <Skeleton className="h-8 w-40 rounded-radius-sm" />
      </div>

      <Surface>
        <div className="flex items-center gap-4 border-b border-border px-4 py-2.5">
          {[`w-24`, `w-16`, `w-20`, `w-14`, `w-16`].map((w, index) => (
            <Skeleton key={`borrow-th-${index}`} className={cn("h-2.5 rounded-xs", w, index === 0 ? "flex-1" : "")} />
          ))}
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`borrow-tr-${index}`} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-6 w-6 rounded-xs" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3 w-32 rounded-xs" />
                <Skeleton className="h-2.5 w-20 rounded-xs" />
              </div>
              <Skeleton className="h-3 w-12 rounded-xs" />
              <Skeleton className="h-3 w-16 rounded-xs" />
              <Skeleton className="h-3 w-14 rounded-xs" />
              <Skeleton className="h-7 w-16 rounded-radius-sm" />
            </div>
          ))}
        </div>
      </Surface>
    </Page>
  )
}

// -----------------------------------------------------------------------------
// lend (`/lend`) — hero + hot markets strip + explore grid + table
// -----------------------------------------------------------------------------

export function LendPageSkeleton() {
  return (
    <Page>
      <BalanceHeroSkeleton actionCount={2} />

      <Surface className="mb-6">
        <div className="grid grid-cols-2 divide-x divide-border md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <MetricTile key={`lend-hero-metric-${index}`} />
          ))}
        </div>
      </Surface>

      <SectionHeader titleWidth="w-24" metaWidth="w-20" />
      <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Surface key={`lend-hot-${index}`} className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-xs" />
                  <Skeleton className="h-3 w-20 rounded-xs" />
                </div>
                <Skeleton className="h-4 w-10 rounded-xs" />
              </div>
              <Skeleton className="h-6 w-20 rounded-xs" />
              <Skeleton className="h-1.5 w-full rounded-xs" />
            </div>
          </Surface>
        ))}
      </div>

      <SectionHeader titleWidth="w-36" />
      <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Surface key={`lend-explore-${index}`} className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-xs" />
                <Skeleton className="h-3 w-24 rounded-xs" />
              </div>
              <Skeleton className="h-6 w-16 rounded-xs" />
              <div className="space-y-1.5">
                <Skeleton className="h-2.5 w-full rounded-xs" />
                <Skeleton className="h-1 w-full rounded-xs" />
              </div>
            </div>
          </Surface>
        ))}
      </div>

      <SectionHeader titleWidth="w-32" />
      <Surface>
        <div className="flex items-center gap-4 border-b border-border px-4 py-2.5">
          {[`flex-1`, `w-14`, `w-16`, `w-16`].map((w, index) => (
            <Skeleton key={`lend-th-${index}`} className={cn("h-2.5 rounded-xs", w)} />
          ))}
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`lend-row-${index}`} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-6 w-6 rounded-xs" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3 w-28 rounded-xs" />
                <Skeleton className="h-2.5 w-16 rounded-xs" />
              </div>
              <Skeleton className="h-3 w-12 rounded-xs" />
              <Skeleton className="h-3 w-16 rounded-xs" />
              <Skeleton className="h-3 w-14 rounded-xs" />
            </div>
          ))}
        </div>
      </Surface>
    </Page>
  )
}

// -----------------------------------------------------------------------------
// perps (`/perps`) — balance row + chart + markets table + account tabs
// -----------------------------------------------------------------------------

export function PerpsPageSkeleton() {
  return (
    <Page>
      <BalanceHeroSkeleton actionCount={3} />

      <Surface className="mb-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-3 w-28 rounded-xs" />
          <div className="flex gap-1 rounded-xs border border-border bg-surface-inset p-0.5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={`perps-range-${index}`} className="h-5 w-8 rounded-xs" />
            ))}
          </div>
        </div>
        <Skeleton className="h-48 w-full rounded-radius-sm" />
      </Surface>

      <SectionHeader titleWidth="w-20" />
      <Surface className="mb-6">
        <div className="flex items-center gap-4 border-b border-border px-4 py-2.5">
          {[`flex-1`, `w-14`, `w-14`, `w-16`, `w-12`].map((w, index) => (
            <Skeleton key={`perps-th-${index}`} className={cn("h-2.5 rounded-xs", w)} />
          ))}
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={`perps-market-${index}`} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-6 w-6 rounded-xs" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24 rounded-xs" />
                <Skeleton className="h-2.5 w-16 rounded-xs" />
              </div>
              <Skeleton className="h-3 w-14 rounded-xs" />
              <Skeleton className="h-3 w-14 rounded-xs" />
              <Skeleton className="h-3 w-16 rounded-xs" />
              <div className="flex gap-1">
                <Skeleton className="h-6 w-12 rounded-xs" />
                <Skeleton className="h-6 w-12 rounded-xs" />
              </div>
            </div>
          ))}
        </div>
      </Surface>

      <Surface>
        <div className="flex gap-4 border-b border-border px-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={`perps-acct-tab-${index}`} className="my-2 h-4 w-20 rounded-xs" />
          ))}
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 3 }).map((_, index) => (
            <ListRow key={`perps-acct-row-${index}`} avatar trailing />
          ))}
        </div>
      </Surface>
    </Page>
  )
}

// -----------------------------------------------------------------------------
// rewards (`/rewards`) — balance hero + overall progress + quest grid
// -----------------------------------------------------------------------------

export function RewardsPageSkeleton() {
  return (
    <Page>
      <BalanceHeroSkeleton actionCount={0} />
      <ProgressRow />

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
// stake (`/stake`) — balance hero + amber notice + progress + wizard grid
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
            <Skeleton className="h-3 w-full max-w-xl rounded-xs" />
            <Skeleton className="h-3 w-4/5 max-w-lg rounded-xs" />
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
// risk warning (`/risk-warning`) — intro + amber notice + accordion + cards
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
          <Skeleton className="h-3 w-full rounded-xs" />
          <Skeleton className="h-3 w-11/12 rounded-xs" />
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
