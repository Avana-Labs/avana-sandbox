"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
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
                <div className="text-[15px] font-normal text-foreground/75">{t("Sell")}</div>
                <div className="mt-1.5 flex items-center justify-between gap-3 max-[360px]:flex-col max-[360px]:items-start">
                  <div className="h-[1em] min-w-0 flex-1 text-[clamp(1.5rem,4vw,2rem)] font-normal leading-none tracking-[-0.04em] text-muted-foreground/60">
                    0
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-[14px] font-normal text-foreground max-[360px]:self-end">
                    {t("Select Asset")}
                    <span aria-hidden className="text-muted-foreground">
                      ▾
                    </span>
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3 text-[14px]">
                  {/* Neutral placeholder while data loads — never a literal "$0.00",
                      which reads as a real (zero) value. Matches the app-wide "—"
                      missing-value convention. */}
                  <span className="min-w-0 truncate text-foreground/60">—</span>
                </div>
              </HomeFieldSkeleton>

              <HomeFieldSkeleton tone="inset">
                <div className="text-[15px] font-normal text-foreground/75">{t("Buy")}</div>
                <div className="mt-1.5 flex items-center justify-between gap-3 max-[360px]:flex-col max-[360px]:items-start">
                  <div className="h-[1em] min-w-0 flex-1 text-[clamp(1.5rem,4vw,2rem)] font-normal leading-none tracking-[-0.04em] text-muted-foreground/60">
                    0
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-[14px] font-normal text-foreground max-[360px]:self-end">
                    {t("Select Asset")}
                    <span aria-hidden className="text-muted-foreground">
                      ▾
                    </span>
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3 text-[14px]">
                  {/* Neutral placeholder while data loads — never a literal "$0.00",
                      which reads as a real (zero) value. Matches the app-wide "—"
                      missing-value convention. */}
                  <span className="min-w-0 truncate text-foreground/60">—</span>
                </div>
              </HomeFieldSkeleton>
            </div>

            <button
              type="button"
              disabled
              className="mt-1 inline-flex h-14 w-full items-center justify-center rounded-radius-xl bg-brand-soft text-[15px] font-normal text-brand-soft-foreground"
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
// umbrella (`/umbrella`) — hero (4 metric tiles) + positions table on the left,
// a sticky 360px action sidebar (4 tabs + action panel) on the right. Mirrors
// `app/umbrella/page.tsx` 1:1 so the real page reveals in place with no shift.
// -----------------------------------------------------------------------------

export function UmbrellaPageSkeleton() {
  return (
    <Page mainClassName="px-3 py-6 pb-28 sm:px-4 md:py-10 lg:pb-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-x-20">
        <div className="min-w-0 space-y-10">
          {/* Hero: "Your Umbrella" heading row + 4-tile metrics card. */}
          <div>
            <div className="mb-6 flex items-center justify-between gap-3">
              <Skeleton className="h-7 w-44 rounded-xs md:h-8" />
              <Skeleton className="h-8 w-28 rounded-full" />
            </div>
            <Surface className="px-4 py-5 sm:px-5">
              <div className="grid grid-cols-2 gap-5 lg:grid-cols-4 lg:divide-x lg:divide-border">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={`umbrella-hero-${index}`} className="min-w-0 lg:px-5 first:lg:pl-0 last:lg:pr-0">
                    <Skeleton className="h-3.5 w-24 rounded-xs" />
                    <Skeleton className="mt-3 h-7 w-28 rounded-xs" shimmer />
                  </div>
                ))}
              </div>
            </Surface>
          </div>

          {/* Positions: heading + table rows (asset · stake · APY · rewards · CTA). */}
          <section>
            <Skeleton className="mb-6 h-7 w-48 rounded-xs md:h-8" />
            <Surface className="px-4 py-2">
              <div className="divide-y divide-border/70">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={`umbrella-row-${index}`} className="flex items-center justify-between gap-4 py-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-28 rounded-xs" />
                      <Skeleton className="h-3 w-20 rounded-xs" />
                    </div>
                    <Skeleton className="hidden h-4 w-16 rounded-xs sm:block" />
                    <Skeleton className="hidden h-4 w-12 rounded-xs sm:block" />
                    <Skeleton className="h-9 w-20 rounded-radius-sm" />
                  </div>
                ))}
              </div>
            </Surface>
          </section>
        </div>

        {/* Action sidebar (desktop): 4-tab strip + action panel. */}
        <aside className="hidden lg:block lg:self-start">
          <div className="sticky top-20 space-y-4">
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={`umbrella-tab-${index}`} className="h-9 flex-1 rounded-full" />
              ))}
            </div>
            <Surface className="space-y-3 p-4">
              <Skeleton className="h-5 w-24 rounded-xs" />
              <Skeleton className="h-[120px] w-full rounded-radius-md" shimmer />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-16 w-full rounded-radius-md" />
                <Skeleton className="h-16 w-full rounded-radius-md" />
              </div>
              <Skeleton className="h-14 w-full rounded-radius-md" />
            </Surface>
          </div>
        </aside>
      </div>
    </Page>
  )
}

/**
 * Route-aware content skeleton. Rendered BELOW the persistent site header (the
 * header lives above the session/auth gates now), so each product route reveals
 * its own layout-matched skeleton while the session chunk / Convex data attaches
 * — never a generic block that swaps the whole page. Falls back to the neutral
 * product skeleton for routes without a bespoke one.
 */
export function RouteContentSkeleton() {
  const pathname = usePathname()
  if (pathname === "/") return <HomeWorkspaceSkeleton />
  if (pathname === "/umbrella" || pathname.startsWith("/umbrella/")) return <UmbrellaPageSkeleton />
  if (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/rewards" ||
    pathname.startsWith("/rewards/")
  ) {
    return <RewardsPageSkeleton />
  }
  return <ProductRoutePending />
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
              <Skeleton className="h-8 w-36 rounded-xs" />
              <Skeleton className="h-4 w-28 rounded-xs" />
            </div>
            <Skeleton className="mt-10 h-[210px] w-full rounded-xs" />
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

/**
 * Instant Paint — layout-stable product chrome while session/auth chunks attach.
 * Used only as a Suspense / dynamic() fallback (not route `loading.tsx`, which
 * still flashes on every soft navigation — see file header).
 */
export function ProductRoutePending() {
  return (
    <Page>
      <div data-testid="product-route-pending" className="space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-8 w-48 rounded-xs" />
          <Skeleton className="h-4 w-72 max-w-full rounded-xs" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Surface className="p-4">
            <Skeleton className="mb-3 h-3.5 w-24 rounded-xs" />
            <Skeleton className="h-8 w-32 rounded-xs" />
          </Surface>
          <Surface className="p-4">
            <Skeleton className="mb-3 h-3.5 w-24 rounded-xs" />
            <Skeleton className="h-8 w-32 rounded-xs" />
          </Surface>
          <Surface className="p-4">
            <Skeleton className="mb-3 h-3.5 w-24 rounded-xs" />
            <Skeleton className="h-8 w-32 rounded-xs" />
          </Surface>
        </div>
        <Surface className="p-4">
          <Skeleton className="mb-4 h-4 w-40 rounded-xs" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={`product-row-${index}`} className="h-12 w-full rounded-xs" />
            ))}
          </div>
        </Surface>
      </div>
    </Page>
  )
}
