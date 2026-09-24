"use client"

import { useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import { Popover as PopoverPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { sizedLocalIconSrc } from "@/app/lib/local-asset-icons"
import { MOBILE_EDGE_RAIL_CLASS } from "@/app/lib/ui/horizontal-rail"
import { TokenIcon } from "@/app/components/token-icon"
import { formatTokenDisplaySymbol } from "@/app/lib/token-icons"
import {
  ASSET_TABS,
  CHAIN_OPTIONS,
  EMPTY_MARKET_FILTERS,
  HUB_OPTIONS,
  activeFilterCount,
  facetCounts,
  type AssetOption,
  type AssetTabId,
  type FacetId,
  type FilterOption,
  type FilterableItem,
  type MarketFilterState,
} from "@/app/lib/markets/filters"

// ----- Icons (inline so they stay crisp at 16–18px and inherit currentColor) ------------------

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cn("size-[18px] shrink-0", className)}>
      <path d="m20 20-3.6-3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10.75" cy="10.75" r="6.25" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function FilterLinesIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cn("size-[18px] shrink-0", className)}>
      <path d="M4 7h16M7 12h10M10 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ChevronsUpDownIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)}>
      <path
        d="m8 9.5 4-4 4 4M8 14.5l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)}>
      <path d="M7 7l10 10M17 7 7 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cn("size-3.5", className)}>
      <path
        d="m5.5 12.5 4 4 9-9"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Testnet has no logo: a brand-tinted disc with a wrench, the universal "test/dev build" mark. */
function TestnetGlyph({ size }: { size: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand dark:bg-brand/15"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" fill="none" style={{ width: size * 0.62, height: size * 0.62 }}>
        <path
          d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function OptionIcon({ option, size }: { option: FilterOption; size: number }) {
  if (option.id === "testnet") return <TestnetGlyph size={size} />
  if (!option.iconSrc) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-surface-inset text-[10px] font-semibold text-muted-foreground dark:bg-white/10"
        style={{ width: size, height: size }}
      >
        {option.label[0]}
      </span>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny local icons, no layout shift at a fixed box
    <img
      src={sizedLocalIconSrc(option.iconSrc, size)}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className="shrink-0 rounded-full object-contain"
      style={{ width: size, height: size }}
    />
  )
}

/** 2×2 cluster of chain logos for the "All Chains" trigger, like a folder of apps. */
function ChainCluster({ chains }: { chains: ReadonlyArray<FilterOption> }) {
  const shown = chains.slice(0, 4)
  return (
    <span aria-hidden="true" className="grid size-5 shrink-0 grid-cols-2 gap-px">
      {shown.map((chain) => (
        <OptionIcon key={chain.id} option={chain} size={9} />
      ))}
    </span>
  )
}

// ----- Pieces --------------------------------------------------------------------------------

const PILL_BASE =
  "group/pill inline-flex h-9 shrink-0 items-center rounded-full border text-[14px] font-medium tracking-[-0.01em] transition-colors " +
  "border-border bg-card text-foreground hover:bg-surface-hover " +
  "dark:border-white/[0.07] dark:bg-[#1c1c1c] dark:text-white dark:hover:bg-[#232323]"

const PILL_OPEN = "bg-surface-hover dark:bg-[#252525] dark:border-white/[0.12]"

const PANEL_CLASS =
  "z-[60] flex w-[min(var(--panel-width),calc(100vw-24px))] data-[fit=content]:w-max data-[fit=content]:min-w-[216px] data-[fit=content]:max-w-[min(var(--panel-width),calc(100vw-24px))] flex-col overflow-hidden rounded-[14px] border border-border bg-popover text-popover-foreground shadow-elev-2 outline-none " +
  "max-h-[min(380px,var(--radix-popover-content-available-height))] dark:border-white/[0.08] dark:bg-[#1c1c1c] " +
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-98 data-[state=open]:zoom-in-98 data-[side=bottom]:slide-in-from-top-1"

function useLabel() {
  const { t } = useTranslation()
  return (option: { label: string; brand?: boolean }) => (option.brand ? option.label : t(option.label))
}

function PanelSearch({
  value,
  onChange,
  placeholder,
  inputRef,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  inputRef: React.MutableRefObject<HTMLInputElement | null>
}) {
  const { t } = useTranslation()
  return (
    <label className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3 text-muted-foreground dark:border-white/[0.07]">
      <SearchIcon className="size-4 text-muted-foreground/80" />
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground/70 dark:text-white"
      />
      {value ? (
        <button
          type="button"
          aria-label={t("Clear search")}
          onClick={() => onChange("")}
          className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-hover hover:text-foreground"
        >
          <CloseIcon className="size-3.5" />
        </button>
      ) : null}
    </label>
  )
}

function SectionHeader({ label, canClear, onClear }: { label: string; canClear: boolean; onClear: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex shrink-0 items-center justify-between px-3 pb-1 pt-2.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{label}</span>
      <button
        type="button"
        disabled={!canClear}
        onClick={onClear}
        className="text-[11px] font-medium uppercase tracking-[0.06em] text-foreground/80 transition-colors hover:text-foreground disabled:cursor-default disabled:text-muted-foreground/45 dark:text-white/80 dark:hover:text-white dark:disabled:text-white/25"
      >
        {t("Clear")}
      </button>
    </div>
  )
}

function OptionRow({
  checked,
  disabled,
  onToggle,
  leading,
  label,
  secondary,
  count,
  showCount = true,
  soon,
}: {
  checked: boolean
  disabled?: boolean
  onToggle: () => void
  leading?: ReactNode
  label: string
  secondary?: string
  count?: number
  /** Hide the number but keep dimming zero-match rows. */
  showCount?: boolean
  soon?: boolean
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "flex min-h-9 w-full items-center gap-2.5 rounded-[9px] px-2 py-1.5 text-left outline-none transition-colors",
        "hover:bg-hover focus-visible:bg-hover disabled:cursor-default disabled:hover:bg-transparent",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors",
          checked
            ? "border-brand bg-brand text-white dark:text-[#0b0b0b]"
            : "border-foreground/20 text-transparent dark:border-white/20",
          disabled && "opacity-40",
        )}
      >
        <CheckIcon className="size-3" />
      </span>
      {leading ? <span className={cn("inline-flex", disabled && "opacity-40")}>{leading}</span> : null}
      <span
        className={cn(
          "flex min-w-0 flex-1 items-baseline gap-2",
          disabled ? "opacity-45" : count === 0 && !checked && "opacity-55",
        )}
      >
        <span
          className={cn(
            "truncate text-[14px]",
            checked ? "font-medium text-foreground dark:text-white" : "text-foreground/80 dark:text-white/80",
          )}
        >
          {label}
        </span>
        {secondary ? (
          <span className="shrink-0 text-[13px] text-muted-foreground dark:text-white/45">{secondary}</span>
        ) : null}
      </span>
      {soon ? (
        <span className="shrink-0 rounded-full bg-surface-inset px-1.5 py-px text-[10px] font-medium text-muted-foreground dark:bg-white/[0.06]">
          {t("Soon")}
        </span>
      ) : showCount && typeof count === "number" ? (
        <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground/80 dark:text-white/35">{count}</span>
      ) : null}
    </button>
  )
}

function EmptyMatches() {
  const { t } = useTranslation()
  return <p className="px-3 py-4 text-center text-[13px] text-muted-foreground">{t("No matches")}</p>
}

// ----- Facet popover -------------------------------------------------------------------------

function FacetPopover({
  facet,
  trigger,
  panelWidth,
  fitContent = false,
  onClearFacet,
  selectedCount,
  children,
}: {
  facet: FacetId
  trigger: (open: boolean) => ReactNode
  panelWidth: number
  /** Shrink to the widest option (short lists like Chains/Hubs) instead of a fixed width. */
  fitContent?: boolean
  onClearFacet: () => void
  selectedCount: number
  children: (inputRef: React.MutableRefObject<HTMLInputElement | null>) => ReactNode
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const anchorRef = useRef<HTMLSpanElement | null>(null)
  const [alignOffset, setAlignOffset] = useState(0)
  const clearLabel = t("Clear {facet} filter").replace("{facet}", t(FACET_TITLES[facet]))

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (next) {
          revealInRail(anchorRef.current)
          setAlignOffset(horizontalOffset(anchorRef.current, panelWidth))
          scrollRoomBelow(anchorRef.current)
        }
        setOpen(next)
      }}
    >
      <PopoverPrimitive.Anchor asChild>
        <span
          ref={anchorRef}
          className={cn(PILL_BASE, open && PILL_OPEN)}
          data-facet={facet}
          data-state={open ? "open" : "closed"}
        >
          <PopoverPrimitive.Trigger
            className={cn(
              "inline-flex h-full items-center gap-2 rounded-full pl-3.5 outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selectedCount > 0 && facet !== "chains" ? "pr-1" : "pr-3.5",
            )}
          >
            {trigger(open)}
          </PopoverPrimitive.Trigger>
          {selectedCount > 0 && facet !== "chains" ? (
            <button
              type="button"
              aria-label={clearLabel}
              onClick={onClearFacet}
              className="mr-1.5 inline-flex size-6 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-hover hover:text-foreground dark:text-white/70 dark:hover:text-white"
            >
              <CloseIcon />
            </button>
          ) : null}
        </span>
      </PopoverPrimitive.Anchor>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="start"
          sideOffset={8}
          // Always drop DOWN (no flip above the pill); the horizontal offset is computed on open
          // so a pill near the right edge (phones) still opens fully on-screen.
          avoidCollisions={false}
          alignOffset={alignOffset}
          collisionPadding={12}
          aria-label={t(FACET_TITLES[facet])}
          className={PANEL_CLASS}
          data-fit={fitContent ? "content" : undefined}
          style={{ ["--panel-width" as string]: `${panelWidth}px` }}
          onOpenAutoFocus={(event) => {
            // Touch screens would pop the keyboard over the list; keep focus on the panel there.
            event.preventDefault()
            if (typeof window !== "undefined" && window.matchMedia?.("(hover: hover)").matches) {
              inputRef.current?.focus()
            }
          }}
        >
          {children(inputRef)}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

/** Room to guarantee below the pill before opening: the panel max height (380px) + gutter. */
const PANEL_ROOM_PX = 392

/**
 * Scrolls the page just enough that the panel has room to drop down below its pill, rather than
 * opening a squashed list against the bottom of a short viewport.
 */
function scrollRoomBelow(anchor: HTMLElement | null) {
  if (!anchor || typeof window === "undefined") return
  const rect = anchor.getBoundingClientRect()
  const shortfall = rect.bottom + PANEL_ROOM_PX - window.innerHeight
  if (shortfall <= 0) return
  // Never scroll the pill itself under the sticky site header (64px) + a little air.
  const maxScroll = Math.max(0, rect.top - 88)
  const delta = Math.min(shortfall, maxScroll)
  if (delta > 0) window.scrollBy({ top: delta, behavior: "smooth" })
}

/** On the phone rail, scroll a partly hidden pill fully into view before its panel anchors to it. */
function revealInRail(anchor: HTMLElement | null) {
  const rail = anchor?.parentElement
  if (!anchor || !rail || rail.scrollWidth <= rail.clientWidth) return
  const pill = anchor.getBoundingClientRect()
  const box = rail.getBoundingClientRect()
  const inset = 12
  if (pill.left < box.left + inset) rail.scrollLeft -= box.left + inset - pill.left
  else if (pill.right > box.right - inset) rail.scrollLeft += pill.right - (box.right - inset)
}

/** Offset from the pill's left edge that keeps a `panelWidth` panel inside a 12px viewport gutter. */
function horizontalOffset(anchor: HTMLElement | null, panelWidth: number) {
  if (!anchor || typeof window === "undefined") return 0
  const gutter = 12
  const width = Math.min(panelWidth, window.innerWidth - gutter * 2)
  const left = anchor.getBoundingClientRect().left
  const clamped = Math.min(Math.max(left, gutter), window.innerWidth - gutter - width)
  return Math.round(clamped - left)
}

const FACET_TITLES: Record<FacetId, string> = {
  chains: "Chains",
  hubs: "Hubs",
  markets: "Markets",
  assets: "Assets",
}

function matchesQuery(query: string, ...values: string[]) {
  const needle = query.trim().toLowerCase()
  return needle.length === 0 || values.some((value) => value.toLowerCase().includes(needle))
}

function OptionListFacet({
  facet,
  heading,
  searchPlaceholder,
  options,
  selected,
  counts,
  onChange,
  trigger,
}: {
  facet: FacetId
  heading: string
  searchPlaceholder: string
  options: ReadonlyArray<FilterOption>
  selected: readonly string[]
  counts: Map<string, number>
  /** Functional update, so rapid toggles never read a stale selection. */
  onChange: (update: (current: readonly string[]) => string[]) => void
  trigger: (open: boolean) => ReactNode
}) {
  const label = useLabel()
  const [query, setQuery] = useState("")
  const visible = options.filter((option) => matchesQuery(query, label(option), option.label))
  // One logo column for the whole list, so a logo-less row (CoW Swap) still lines up.
  const withIcons = facet === "chains" || options.some((option) => option.iconSrc)
  const toggle = (id: string) =>
    onChange((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]))

  return (
    <FacetPopover
      facet={facet}
      trigger={trigger}
      panelWidth={288}
      fitContent
      selectedCount={selected.length}
      onClearFacet={() => onChange(() => [])}
    >
      {(inputRef) => (
        <>
          <PanelSearch value={query} onChange={setQuery} placeholder={searchPlaceholder} inputRef={inputRef} />
          <SectionHeader label={heading} canClear={selected.length > 0} onClear={() => onChange(() => [])} />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 pb-1.5" data-filter-options={facet}>
            {visible.length === 0 ? <EmptyMatches /> : null}
            {visible.map((option) => (
              <OptionRow
                key={option.id}
                checked={selected.includes(option.id)}
                disabled={option.soon}
                soon={option.soon}
                onToggle={() => toggle(option.id)}
                leading={withIcons ? <OptionIcon option={option} size={20} /> : undefined}
                label={label(option)}
                count={counts.get(option.id) ?? 0}
              />
            ))}
          </div>
        </>
      )}
    </FacetPopover>
  )
}

function AssetFacet({
  options,
  selected,
  counts,
  onChange,
  trigger,
}: {
  options: ReadonlyArray<AssetOption>
  selected: readonly string[]
  counts: Map<string, number>
  /** Functional update, so rapid toggles never read a stale selection. */
  onChange: (update: (current: readonly string[]) => string[]) => void
  trigger: (open: boolean) => ReactNode
}) {
  const { t } = useTranslation()
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<AssetTabId>("all")
  const tabs = ASSET_TABS.filter((entry) => entry.id === "all" || options.some((option) => option.tab === entry.id))
  const visible = options.filter(
    (option) => (tab === "all" || option.tab === tab) && matchesQuery(query, option.name, option.symbol),
  )
  const selectedKeys = new Set(selected.map((symbol) => symbol.toUpperCase()))
  // One market per asset (Lend) makes every count a "1": noise, so only show counts that vary.
  const showCounts = options.some((option) => (counts.get(option.symbol.toUpperCase()) ?? 0) > 1)
  const toggle = (symbol: string) => {
    const key = symbol.toUpperCase()
    onChange((current) =>
      current.some((value) => value.toUpperCase() === key)
        ? current.filter((value) => value.toUpperCase() !== key)
        : [...current, symbol],
    )
  }

  return (
    <FacetPopover
      facet="assets"
      trigger={trigger}
      panelWidth={324}
      selectedCount={selected.length}
      onClearFacet={() => onChange(() => [])}
    >
      {(inputRef) => (
        <>
          <PanelSearch value={query} onChange={setQuery} placeholder={t("Search assets")} inputRef={inputRef} />
          <div
            role="tablist"
            aria-label={t("Asset type")}
            className="flex shrink-0 items-end gap-3.5 overflow-x-auto border-b border-border px-3 [scrollbar-width:none] dark:border-white/[0.07] [&::-webkit-scrollbar]:hidden"
          >
            {tabs.map((entry) => {
              const active = entry.id === tab
              return (
                <button
                  key={entry.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(entry.id)}
                  className={cn(
                    "relative shrink-0 whitespace-nowrap pb-2 pt-2.5 text-[13px] transition-colors",
                    active
                      ? "font-medium text-foreground after:absolute after:inset-x-0 after:bottom-[-1px] after:h-[2px] after:rounded-full after:bg-foreground dark:text-white dark:after:bg-white"
                      : "text-muted-foreground hover:text-foreground dark:text-white/45 dark:hover:text-white/80",
                  )}
                >
                  {t(entry.label)}
                </button>
              )
            })}
          </div>
          <SectionHeader label={t("Assets")} canClear={selected.length > 0} onClear={() => onChange(() => [])} />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 pb-1.5" data-filter-options="assets">
            {visible.length === 0 ? <EmptyMatches /> : null}
            {visible.map((option) => (
              <OptionRow
                key={option.symbol}
                checked={selectedKeys.has(option.symbol.toUpperCase())}
                onToggle={() => toggle(option.symbol)}
                leading={<TokenIcon symbol={option.symbol} pixelSize={20} />}
                label={option.name}
                secondary={
                  option.name.toUpperCase() === option.symbol.toUpperCase()
                    ? undefined
                    : formatTokenDisplaySymbol(option.symbol)
                }
                count={counts.get(option.symbol.toUpperCase()) ?? 0}
                showCount={showCounts}
              />
            ))}
          </div>
        </>
      )}
    </FacetPopover>
  )
}

// ----- Bar -----------------------------------------------------------------------------------

function PageSearch({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <label
      className={cn(
        "flex h-9 items-center gap-2.5 rounded-full border px-3.5 text-muted-foreground transition-colors",
        "border-border bg-card focus-within:border-foreground/25 dark:border-white/[0.07] dark:bg-transparent dark:focus-within:border-white/20",
        className,
      )}
    >
      <SearchIcon className="size-4 text-muted-foreground/80" />
      <input
        aria-label={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground/70 dark:text-white"
      />
      {value ? (
        <button
          type="button"
          aria-label={t("Clear search")}
          onClick={() => onChange("")}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-full hover:bg-hover hover:text-foreground"
        >
          <CloseIcon className="size-3.5" />
        </button>
      ) : null}
    </label>
  )
}

export type MarketFiltersBarProps = {
  /** Every row on the page, reduced to its facets (drives the per-option counts). */
  items: readonly FilterableItem[]
  value: MarketFilterState
  onChange: Dispatch<SetStateAction<MarketFilterState>>
  marketOptions: ReadonlyArray<FilterOption>
  assetOptions: ReadonlyArray<AssetOption>
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  className?: string
}

/**
 * Lend / Borrow / Multiply filter row: [All Chains] | [Hubs] [Markets] [Assets] … [search].
 * Each pill opens a searchable multi-select panel (portaled, so the horizontally scrolling
 * mobile rail can't clip it). A pill with a selection reads "Hubs (2)" and gains an ×.
 */
export function MarketFiltersBar({
  items,
  value,
  onChange,
  marketOptions,
  assetOptions,
  search,
  onSearchChange,
  searchPlaceholder,
  className,
}: MarketFiltersBarProps) {
  const { t } = useTranslation()
  const label = useLabel()
  const set = (facet: FacetId) => (update: (current: readonly string[]) => string[]) =>
    onChange((current) => ({ ...current, [facet]: update(current[facet]) }))

  const counts = useMemo(
    () => ({
      chains: facetCounts(items, value, "chains"),
      hubs: facetCounts(items, value, "hubs"),
      markets: facetCounts(items, value, "markets"),
      assets: facetCounts(items, value, "assets"),
    }),
    [items, value],
  )

  const selectedChains = CHAIN_OPTIONS.filter((chain) => value.chains.includes(chain.id))
  const pillLabel = (facet: Exclude<FacetId, "chains">) => {
    const count = value[facet].length
    return count > 0 ? `${t(FACET_TITLES[facet])} (${count})` : t(FACET_TITLES[facet])
  }
  const facetTrigger = (facet: Exclude<FacetId, "chains">) => () => (
    <>
      <FilterLinesIcon className="size-4 text-foreground/70 dark:text-white/70" />
      <span className="whitespace-nowrap">{pillLabel(facet)}</span>
    </>
  )

  const chainTrigger = () => (
    <>
      {selectedChains.length === 1 ? (
        <OptionIcon option={selectedChains[0]} size={20} />
      ) : (
        <ChainCluster
          chains={selectedChains.length > 1 ? selectedChains : CHAIN_OPTIONS.filter((chain) => chain.id !== "testnet")}
        />
      )}
      <span className="whitespace-nowrap">
        {selectedChains.length === 0
          ? t("All Chains")
          : selectedChains.length === 1
            ? label(selectedChains[0])
            : `${t("Chains")} (${selectedChains.length})`}
      </span>
      <ChevronsUpDownIcon className="size-3.5 text-foreground/60 dark:text-white/60" />
    </>
  )

  const anyActive = activeFilterCount(value) > 0

  const pills = (
    <>
      <OptionListFacet
        facet="chains"
        heading={t("Filter by")}
        searchPlaceholder={t("Search chains")}
        options={CHAIN_OPTIONS}
        selected={value.chains}
        counts={counts.chains}
        onChange={set("chains")}
        trigger={chainTrigger}
      />
      <span aria-hidden="true" className="h-5 w-px shrink-0 bg-border dark:bg-white/10" />
      <OptionListFacet
        facet="hubs"
        heading={t("Hubs")}
        searchPlaceholder={t("Search hubs")}
        options={HUB_OPTIONS}
        selected={value.hubs}
        counts={counts.hubs}
        onChange={set("hubs")}
        trigger={facetTrigger("hubs")}
      />
      <OptionListFacet
        facet="markets"
        heading={t("Markets")}
        searchPlaceholder={t("Search markets")}
        options={marketOptions}
        selected={value.markets}
        counts={counts.markets}
        onChange={set("markets")}
        trigger={facetTrigger("markets")}
      />
      <AssetFacet
        options={assetOptions}
        selected={value.assets}
        counts={counts.assets}
        onChange={set("assets")}
        trigger={facetTrigger("assets")}
      />
      {anyActive ? (
        <button
          type="button"
          onClick={() => onChange(EMPTY_MARKET_FILTERS)}
          className="ml-1 shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground dark:hover:text-white"
        >
          {t("Clear all")}
        </button>
      ) : null}
    </>
  )

  return (
    // One render for every width: phones and tablets stack a full-width search over a
    // horizontally scrolling rail of pills; lg+ puts the pills left and the search right.
    <div
      className={cn("flex w-full flex-col gap-3 lg:flex-row lg:items-center", className)}
      data-testid="market-filters"
    >
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] md:gap-2.5 lg:flex-wrap lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden",
          MOBILE_EDGE_RAIL_CLASS,
        )}
        data-testid="market-filters-rail"
      >
        {pills}
      </div>
      <PageSearch
        value={search}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
        className="order-first w-full lg:order-none lg:w-[260px] lg:shrink-0 xl:w-[300px]"
      />
    </div>
  )
}

/** Empty result for a filtered market list, with a one-click reset of every filter and the search. */
export function MarketFiltersEmptyState({ message, onClear }: { message: string; onClear?: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center gap-3 rounded-radius-md bg-card px-6 py-10 text-center text-[14px] text-muted-foreground">
      <p>{message}</p>
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="rounded-full border border-border px-4 py-1.5 text-[14px] font-medium text-foreground transition-colors hover:bg-surface-hover dark:border-white/10 dark:text-white dark:hover:bg-white/[0.06]"
        >
          {t("Clear filters")}
        </button>
      ) : null}
    </div>
  )
}
