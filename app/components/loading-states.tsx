"use client"

import type { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { ActionWorkspaceTabs } from "@/app/components/action-page/action-workspace-tabs"
import { HOME_MODE_ITEMS } from "@/app/components/home/home-workspace-card"

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
  const { t } = useTranslation()
  return (
    // A single polite status region announces the load once; the placeholder blocks inside
    // are decorative (aria-hidden) so assistive tech isn't dragged across empty rectangles.
    <div className="bg-background" role="status" aria-busy="true" aria-live="polite" aria-label={t("Loading")}>
      <span className="sr-only">{t("Loading…")}</span>
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

/** One swap-style field box (sell / buy) — matches `SwapStyleField`. */
function HomeFieldSkeleton({ children, tone }: { children: ReactNode; tone: "raised" | "inset" }) {
  return (
    <div
      className={cn(
        "rounded-radius-xl px-4 py-3",
        tone === "raised" && "border border-border bg-field-top text-card-foreground dark:shadow-none",
        tone === "inset" && "border border-transparent bg-field-bottom",
      )}
    >
      {children}
    </div>
  )
}

export function HomeWorkspaceSkeleton() {
  const { t } = useTranslation()
  return (
    // Keep the loading testid on the root so the initial-HTML shell assertion in
    // tests/e2e/route-performance.spec.ts still finds it.
    <div
      className="bg-background"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={t("Loading")}
      data-testid="home-workspace-loading"
    >
      <span className="sr-only">{t("Loading…")}</span>
      <section className="skeleton-enter flex min-h-[calc(100dvh-4rem)] justify-center px-4 pb-12 pt-14 md:pb-16 md:pt-20">
        <div className="w-full max-w-[480px]">
          {/* Mirror the real card's icon tab strip 1:1 (same ActionWorkspaceTabs,
              Swap active) so the skeleton shows icons and the card reveals with
              zero shift. Non-interactive placeholder — the root status region
              already announces the load. */}
          <div className="pointer-events-none flex items-center justify-between gap-2" aria-hidden>
            <ActionWorkspaceTabs
              items={HOME_MODE_ITEMS.map((item) => ({ id: item.value, label: item.label }))}
              value="swap"
              onChange={() => {}}
              ariaLabel="Express actions"
              withIcons
              revealLabels
            />
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <HomeFieldSkeleton tone="raised">
                <div className="text-[15px] font-medium text-foreground/75">{t("Sell")}</div>
                <div className="mt-1.5 flex items-center justify-between gap-3 max-[360px]:flex-col max-[360px]:items-start">
                  <div className="h-[1em] min-w-0 flex-1 text-[clamp(1.5rem,4vw,2rem)] font-medium leading-none tracking-[-0.04em] text-muted-foreground/60">
                    0
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-[14px] font-medium text-foreground max-[360px]:self-end">
                    {t("Select Asset")}
                    <span aria-hidden className="text-muted-foreground">
                      ▾
                    </span>
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3 text-[14px]">
                  <span className="min-w-0 truncate text-foreground/60">$0.00</span>
                </div>
              </HomeFieldSkeleton>

              <HomeFieldSkeleton tone="inset">
                <div className="text-[15px] font-medium text-foreground/75">{t("Buy")}</div>
                <div className="mt-1.5 flex items-center justify-between gap-3 max-[360px]:flex-col max-[360px]:items-start">
                  <div className="h-[1em] min-w-0 flex-1 text-[clamp(1.5rem,4vw,2rem)] font-medium leading-none tracking-[-0.04em] text-muted-foreground/60">
                    0
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-[14px] font-medium text-foreground max-[360px]:self-end">
                    {t("Select Asset")}
                    <span aria-hidden className="text-muted-foreground">
                      ▾
                    </span>
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3 text-[14px]">
                  <span className="min-w-0 truncate text-foreground/60">$0.00</span>
                </div>
              </HomeFieldSkeleton>
            </div>

            <button
              type="button"
              disabled
              className="mt-1 inline-flex h-14 w-full items-center justify-center rounded-radius-xl bg-brand-soft text-[15px] font-semibold text-brand-soft-foreground"
              data-testid="action-footer-primary"
            >
              {t("Select Asset")}
            </button>
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
      <div className="mb-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-7 w-40 rounded-xs md:h-8" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
        {/* Balance hero (left) + promo card (right, md+) — RewardsBalanceHero. */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-x-20">
          <Surface className="relative min-h-[310px] px-4 py-4 sm:px-5">
            <div className="space-y-3">
              <Skeleton shimmer className="h-8 w-36 rounded-xs" />
              <Skeleton className="h-4 w-28 rounded-xs" />
            </div>
            <Skeleton shimmer className="mt-10 h-[210px] w-full rounded-xs" />
          </Surface>

          <div className="hidden space-y-3 lg:block">
            <Surface className="p-4">
              <Skeleton className="mb-3 h-3.5 w-28 rounded-xs" />
              <Skeleton className="h-8 w-36 rounded-xs" />
            </Surface>
            <Surface className="p-4">
              <Skeleton className="mb-3 h-3.5 w-28 rounded-xs" />
              <Skeleton className="h-8 w-36 rounded-xs" />
            </Surface>
          </div>
        </div>
      </div>

      <div className="space-y-14 md:space-y-16">
        <section>
          <div className="mb-6">
            <Skeleton className="h-7 w-48 rounded-xs md:h-8" />
          </div>
          {/* Underline tab strip (left-aligned, border-b). */}
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
        </section>
      </div>
    </Page>
  )
}

// -----------------------------------------------------------------------------
// Shared building blocks used by every product-landing skeleton so the shapes
// stay consistent and can be tweaked in one place.
// -----------------------------------------------------------------------------

/** 4-column hero metric strip — the row of "Total X · Change · APY" tiles. */
function HeroMetricsRow({ count = 4 }: { count?: number }) {
  return (
    <Surface className="px-4 py-5 sm:px-5">
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4 lg:divide-x lg:divide-border">
        {Array.from({ length: count }).map((_, index) => (
          <div key={`metric-${index}`} className="min-w-0 lg:px-5 first:lg:pl-0 last:lg:pr-0">
            <Skeleton className="h-3.5 w-24 rounded-xs" />
            <div className="mt-2 space-y-1.5">
              <Skeleton shimmer className="h-7 w-32 rounded-xs md:h-8" />
              <Skeleton className="h-3 w-20 rounded-xs" />
            </div>
          </div>
        ))}
      </div>
    </Surface>
  )
}

/** Section header — "Section title" + optional right-aligned control. */
function SectionHeader({ withControl = false }: { withControl?: boolean }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <Skeleton className="h-7 w-48 rounded-xs md:h-8" />
      {withControl ? <Skeleton className="h-8 w-24 rounded-full" /> : null}
    </div>
  )
}

/** Full-width table stand-in with `rows` rows. Matches the desktop table shape. */
function TableBlock({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <Surface className="!rounded-none px-0 py-2">
      {/* Header row */}
      <div className="grid gap-4 border-b border-border/70 px-5 py-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={`th-${index}`} className="h-3 w-16 rounded-xs" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`tr-${rowIndex}`}
          className="grid gap-4 border-b border-border/40 px-5 py-4 last:border-b-0"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}
        >
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-9 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-24 rounded-xs" />
              <Skeleton className="h-3 w-16 rounded-xs" />
            </div>
          </div>
          {Array.from({ length: columns - 1 }).map((_, cellIndex) => (
            <div key={`tr-${rowIndex}-td-${cellIndex}`} className="flex items-center">
              <Skeleton className="h-4 w-20 rounded-xs" />
            </div>
          ))}
        </div>
      ))}
    </Surface>
  )
}

/** Sidebar action card — matches the 360-px action rail on detail routes. */
function SidebarActionCardBlock() {
  return (
    <aside className="hidden space-y-3 lg:block">
      {/* Tab strip */}
      <div className="flex gap-2 rounded-full bg-muted/60 p-1">
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={`sidebar-tab-${index}`} className="h-8 flex-1 rounded-full" />
        ))}
      </div>
      <Surface className="px-4 py-4">
        <div className="space-y-4">
          <Skeleton className="h-3.5 w-16 rounded-xs" />
          <Skeleton shimmer className="h-14 w-full rounded-radius-md" />
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-24 rounded-xs" />
            <Skeleton className="h-3.5 w-full rounded-xs" />
            <Skeleton className="h-3.5 w-4/5 rounded-xs" />
          </div>
          <Skeleton className="h-11 w-full rounded-radius-md" />
        </div>
      </Surface>
    </aside>
  )
}

/** Carousel row of N compact cards — used for cooldown / stress-tests. */
function CarouselRow({ count = 3, cardHeight = "h-32" }: { count?: number; cardHeight?: string }) {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: count }).map((_, index) => (
        <Surface key={`carousel-${index}`} className={cn("w-[min(320px,88%)] shrink-0 px-4 py-4 md:w-[360px]", cardHeight)}>
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-24 rounded-xs" />
              <Skeleton className="h-3 w-32 rounded-xs" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Skeleton className="h-4 w-full rounded-xs" />
            <Skeleton className="h-4 w-full rounded-xs" />
          </div>
        </Surface>
      ))}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Umbrella (`/umbrella`) — hero metrics → positions table + sidebar → cooldown
// carousel → activity → market-risk cards → learn cards. Mirrors the sections
// in app/umbrella/page.tsx.
// -----------------------------------------------------------------------------

export function UmbrellaPageSkeleton() {
  return (
    <Page mainClassName="px-3 py-6 pb-28 sm:px-4 md:py-10 lg:pb-10">
      <div className="flex flex-col gap-10 md:gap-14">
        <div>
          <SectionHeader withControl />
          <HeroMetricsRow count={4} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-x-20">
          <div className="min-w-0">
            <SectionHeader />
            <TableBlock rows={4} columns={5} />
          </div>
          <SidebarActionCardBlock />
        </div>

        <div>
          <SectionHeader withControl />
          <CarouselRow count={3} cardHeight="h-40" />
        </div>

        <div>
          <SectionHeader />
          <TableBlock rows={5} columns={4} />
        </div>

        <div>
          <SectionHeader withControl />
          <CarouselRow count={3} cardHeight="h-60" />
        </div>

        <div>
          <SectionHeader />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Surface key={`learn-${index}`} className="px-4 py-4">
                <Skeleton className="size-6 rounded-full" />
                <Skeleton className="mt-4 h-4 w-32 rounded-xs" />
                <div className="mt-2 space-y-1.5">
                  <Skeleton className="h-3 w-full rounded-xs" />
                  <Skeleton className="h-3 w-4/5 rounded-xs" />
                </div>
              </Surface>
            ))}
          </div>
        </div>
      </div>
    </Page>
  )
}

// -----------------------------------------------------------------------------
// Borrow / Lend / Multiply landing (`/borrow`, `/lend`, `/multiply`) — hero
// metrics row → hot markets carousel → main table.
// -----------------------------------------------------------------------------

export function ProductLandingSkeleton() {
  return (
    <Page mainClassName="px-3 py-6 pb-28 sm:px-4 md:py-10 lg:pb-10">
      <div className="flex flex-col gap-10 md:gap-14">
        <div>
          <SectionHeader withControl />
          <HeroMetricsRow count={4} />
        </div>

        <div>
          <SectionHeader withControl />
          <CarouselRow count={4} cardHeight="h-36" />
        </div>

        <div>
          <SectionHeader withControl />
          <TableBlock rows={6} columns={6} />
        </div>
      </div>
    </Page>
  )
}

// -----------------------------------------------------------------------------
// Dashboard (`/dashboard`) — tab strip → wallet/portfolio hero → activity table.
// -----------------------------------------------------------------------------

export function DashboardPageSkeleton() {
  return (
    <Page mainClassName="px-3 py-6 pb-28 sm:px-4 md:py-10 lg:pb-10">
      <div className="flex flex-col gap-10 md:gap-12">
        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-8 w-40 rounded-xs md:h-10" />
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>

          {/* Tab strip */}
          <div className="mb-8 flex gap-2 overflow-x-auto pb-1">
            {["w-20", "w-24", "w-20", "w-24", "w-16", "w-28"].map((width, index) => (
              <Skeleton key={`dash-tab-${index}`} className={cn("h-9 rounded-full", width)} />
            ))}
          </div>

          <HeroMetricsRow count={4} />
        </div>

        <div>
          <SectionHeader withControl />
          <TableBlock rows={6} columns={5} />
        </div>
      </div>
    </Page>
  )
}

// -----------------------------------------------------------------------------
// Detail (market/pool/asset) — hero card → sub-nav → chart/metrics + sidebar.
// -----------------------------------------------------------------------------

export function DetailPageSkeleton() {
  return (
    <Page mainClassName="px-3 py-6 pb-28 sm:px-4 md:py-10 lg:pb-10">
      <div className="flex flex-col gap-8 md:gap-10">
        {/* Breadcrumb + title */}
        <div className="flex items-center gap-3">
          <Skeleton className="size-14 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-6 w-40 rounded-xs md:h-7" />
            <Skeleton className="h-3.5 w-32 rounded-xs" />
          </div>
          <Skeleton className="hidden h-9 w-28 rounded-full md:block" />
        </div>

        <HeroMetricsRow count={3} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-x-20">
          <div className="min-w-0 space-y-6">
            <Surface className="px-4 py-4">
              <Skeleton className="h-3.5 w-32 rounded-xs" />
              <Skeleton shimmer className="mt-3 h-[240px] w-full rounded-radius-md" />
            </Surface>
            <TableBlock rows={5} columns={5} />
          </div>
          <SidebarActionCardBlock />
        </div>
      </div>
    </Page>
  )
}

// -----------------------------------------------------------------------------
// Generic app-shell fallback — used when the pathname doesn't match anything
// specific. Neutral hero + content block so the layout doesn't collapse to
// nothing while a slow session gate resolves.
// -----------------------------------------------------------------------------

export function AppShellSkeleton() {
  return (
    <Page mainClassName="px-3 py-6 pb-28 sm:px-4 md:py-10 lg:pb-10">
      <div className="flex flex-col gap-10 md:gap-14">
        <div>
          <SectionHeader withControl />
          <HeroMetricsRow count={4} />
        </div>
        <div>
          <SectionHeader />
          <TableBlock rows={5} columns={5} />
        </div>
      </div>
    </Page>
  )
}

// -----------------------------------------------------------------------------
// Onboarding-card shimmer — sits inside the sandbox gate's LockedShell (Header +
// main), which already provides its own chrome. Just fill the centered card
// shape so the gate has something structurally correct while auth resolves.
// -----------------------------------------------------------------------------

export function OnboardingCardSkeleton() {
  const { t } = useTranslation()
  return (
    <div
      className="skeleton-enter mx-auto w-full max-w-[480px]"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={t("Loading")}
    >
      <span className="sr-only">{t("Loading…")}</span>
      <Surface className="p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-32 rounded-xs" />
            <Skeleton className="h-3 w-24 rounded-xs" />
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <Skeleton shimmer className="h-14 w-full rounded-radius-md" />
          <Skeleton className="h-3.5 w-4/5 rounded-xs" />
          <Skeleton className="h-3.5 w-3/5 rounded-xs" />
        </div>
        <Skeleton className="mt-6 h-11 w-full rounded-radius-md" />
      </Surface>
    </div>
  )
}
