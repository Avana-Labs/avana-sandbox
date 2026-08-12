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
      {/* Balance hero (left) + promo card (right, md+) — RewardsBalanceHero. */}
      <div className="mb-6 grid gap-5 md:mb-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-x-20">
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
    </Page>
  )
}
