import type { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type LoadingShellProps = {
  children: ReactNode
  className?: string
}

type LoadingIntroProps = {
  actionCount?: number
}

function LoadingPageShell({ children, className }: LoadingShellProps) {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className={cn("mx-auto max-w-5xl space-y-6", className)}>{children}</div>
    </main>
  )
}

function LoadingSurface({ children, className }: LoadingShellProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-border/70 bg-card/70 shadow-[0_18px_42px_rgba(15,23,42,0.045)] backdrop-blur-sm",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.82),transparent_45%)]" />
      <div className="relative p-6 sm:p-7">{children}</div>
    </section>
  )
}

function LoadingPageIntro({ actionCount = 0 }: LoadingIntroProps) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 space-y-3">
        <Skeleton className="h-8 w-72 max-w-full" />
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-full max-w-lg" />
          <Skeleton className="h-3.5 w-4/5 max-w-md" />
        </div>
      </div>
      {actionCount > 0 ? (
        <div className="flex flex-wrap gap-2 self-start sm:self-center">
          {Array.from({ length: actionCount }).map((_, index) => (
            <Skeleton key={`action-${index}`} className="h-9 w-28 rounded-full" />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function LoadingMetricStrip({ columns = 3 }: { columns?: number }) {
  return (
    <LoadingSurface>
      <div className={`grid grid-cols-1 gap-6 ${columns === 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}>
        {Array.from({ length: columns }).map((_, index) => (
          <div
            key={`metric-${index}`}
            className={cn("space-y-4", index > 0 && columns === 3 ? "md:border-l md:border-border/60 md:pl-6" : "")}
          >
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-12 w-full rounded-[20px]" />
          </div>
        ))}
      </div>
    </LoadingSurface>
  )
}

function LoadingPills({ count }: { count: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={`pill-${index}`} className="h-9 w-24 rounded-full" />
      ))}
    </div>
  )
}

function LoadingRowList({
  rows,
  withLeadingIcon = false,
  withAction = false,
}: {
  rows: number
  withLeadingIcon?: boolean
  withAction?: boolean
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={`loading-row-${index}`} className="flex items-center gap-4 rounded-2xl border border-border/60 bg-background/50 px-4 py-4">
          {withLeadingIcon ? <Skeleton className="h-9 w-9 rounded-full" /> : null}
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-32 max-w-full" />
            <Skeleton className="h-3.5 w-full max-w-sm" />
          </div>
          {withAction ? <Skeleton className="h-8 w-16 rounded-full" /> : null}
        </div>
      ))}
    </div>
  )
}

function LoadingWorkspace({
  chipCount = 0,
  sidebarRows = 3,
  canvasHeight = "h-[280px]",
}: {
  chipCount?: number
  sidebarRows?: number
  canvasHeight?: string
}) {
  return (
    <LoadingSurface>
      <div className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-6 w-52 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        {chipCount > 0 ? <LoadingPills count={chipCount} /> : null}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
          <div className="space-y-4">
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className={cn("w-full rounded-[24px]", canvasHeight)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
          <LoadingRowList rows={sidebarRows} withLeadingIcon withAction />
        </div>
      </div>
    </LoadingSurface>
  )
}

function LoadingProgressRail() {
  return (
    <LoadingSurface>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-3 w-full rounded-full" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`step-${index}`} className="h-2.5 flex-1 rounded-full" />
          ))}
        </div>
      </div>
    </LoadingSurface>
  )
}

function LoadingFormWorkspace({ sidebarRows = 3 }: { sidebarRows?: number }) {
  return (
    <LoadingSurface>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.85fr)]">
        <div className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-6 w-52 max-w-full" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <div className="space-y-4 rounded-[24px] border border-border/60 bg-background/50 p-5">
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-44 w-full rounded-[22px]" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-10 w-24 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-40" />
          </div>
          <LoadingRowList rows={sidebarRows} withLeadingIcon />
        </div>
      </div>
    </LoadingSurface>
  )
}

export function HomeMarketsTabSkeleton() {
  return (
    <LoadingSurface>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.9fr)]">
        <div className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-6 w-56 max-w-full" />
            <Skeleton className="h-4 w-44" />
          </div>
          <LoadingRowList rows={3} withLeadingIcon />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-56 w-full rounded-[24px]" />
        </div>
      </div>
    </LoadingSurface>
  )
}

export function HomeResourcesTabSkeleton() {
  return (
    <LoadingSurface>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <div className="space-y-5">
          <div className="space-y-3">
            <Skeleton className="h-8 w-72 max-w-full" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-4/5 max-w-sm" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="h-10 w-20 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 rounded-2xl border border-border/60 bg-background/50 p-4">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3.5 w-24" />
            </div>
            <div className="space-y-2 rounded-2xl border border-border/60 bg-background/50 p-4">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-[24px]" />
          <LoadingRowList rows={2} withAction />
        </div>
      </div>
    </LoadingSurface>
  )
}

export function HomePageSkeleton() {
  return (
    <LoadingPageShell>
      <LoadingPageIntro actionCount={2} />
      <LoadingMetricStrip columns={4} />
      <LoadingSurface>
        <div className="space-y-5">
          <LoadingPills count={3} />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`home-card-${index}`} className="space-y-4 rounded-[24px] border border-border/60 bg-background/50 p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3.5 w-20" />
                  </div>
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((__, cellIndex) => (
                    <Skeleton key={`home-card-${index}-cell-${cellIndex}`} className="aspect-square rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </LoadingSurface>
    </LoadingPageShell>
  )
}

export function BorrowPageSkeleton() {
  return (
    <LoadingPageShell>
      <LoadingPageIntro actionCount={3} />
      <LoadingMetricStrip />
      <LoadingWorkspace chipCount={5} sidebarRows={4} canvasHeight="h-[320px]" />
    </LoadingPageShell>
  )
}

export function ManagePageSkeleton() {
  return (
    <LoadingPageShell>
      <LoadingPageIntro actionCount={1} />
      <LoadingMetricStrip />
      <LoadingSurface>
        <div className="space-y-5">
          <LoadingPills count={3} />
          <LoadingRowList rows={4} withAction />
        </div>
      </LoadingSurface>
    </LoadingPageShell>
  )
}

export function StakePageSkeleton() {
  return (
    <LoadingPageShell>
      <LoadingPageIntro actionCount={1} />
      <LoadingSurface className="border-yellow-500/30 bg-yellow-500/5">
        <div className="flex items-start gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-full max-w-3xl" />
            <Skeleton className="h-4 w-4/5 max-w-2xl" />
          </div>
        </div>
      </LoadingSurface>
      <LoadingProgressRail />
      <LoadingFormWorkspace sidebarRows={3} />
    </LoadingPageShell>
  )
}

export function RiskWarningPageSkeleton() {
  return (
    <LoadingPageShell className="max-w-4xl">
      <LoadingPageIntro />
      <LoadingSurface className="border-yellow-500/30 bg-yellow-500/5">
        <div className="space-y-3">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
        </div>
      </LoadingSurface>
      <LoadingSurface>
        <div className="space-y-4">
          <Skeleton className="h-7 w-32" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`risk-item-${index}`} className="border-b border-border/60 pb-4 last:border-b-0 last:pb-0">
              <Skeleton className="h-5 w-full max-w-xl" />
              <Skeleton className="mt-3 h-3.5 w-5/6 max-w-2xl" />
            </div>
          ))}
        </div>
      </LoadingSurface>
      <LoadingSurface>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="mt-2 h-11 w-44 rounded-full" />
          </div>
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
      </LoadingSurface>
    </LoadingPageShell>
  )
}
