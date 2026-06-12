"use client"

import { useEffect, useRef, useState } from "react"
import { BORROW_DEXES, type BorrowDexId } from "@/app/lib/borrow-sim"
import { useTheme } from "@/app/components/theme-provider"
import { cn } from "@/lib/utils"

export const POOL_TAB_IDS = ["all-markets", "btc", "eth", "forex", "governance", "smart-pools"] as const

export type PoolTabId = (typeof POOL_TAB_IDS)[number]

export type BorrowTabId = PoolTabId

export function isPoolTab(tab: BorrowTabId): tab is PoolTabId {
  return POOL_TAB_IDS.includes(tab as PoolTabId)
}

export type TabsBarProps = {
  currentTab: BorrowTabId
  onTabChange: (tab: BorrowTabId) => void
  search: string
  onSearchChange: (value: string) => void
  selectedDexes: Set<BorrowDexId>
  onDexChange: (dex: BorrowDexId | null) => void
}

const TAB_ORDER: Array<{ id: BorrowTabId; label: string }> = [
  { id: "all-markets", label: "All" },
  { id: "btc", label: "BTC Based" },
  { id: "eth", label: "ETH Based" },
  { id: "forex", label: "Forex Based" },
  { id: "governance", label: "Utility Based" },
  { id: "smart-pools", label: "Smart Pools" },
]

function SearchIcon({ className }: { className?: string } = {}) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cn("size-6 text-muted-foreground/70 dark:text-white/40", className)}>
      <path d="m21 21-4.2-4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12" fill="none" className="size-3 text-muted-foreground/70 dark:text-white/60">
      <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ExpandableDesktopSearch({
  value,
  onChange,
}: {
  value: string
  onChange: (nextValue: string) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const isExpanded = open || value.length > 0

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative hidden md:block">
      <div
        className={cn(
          "flex h-10 items-center overflow-hidden border shadow-elev-1 transition-[width,border-radius,background-color,border-color] duration-200",
          isExpanded ? "w-[240px] rounded-[12px] px-3" : "w-10 cursor-pointer justify-center rounded-[12px]",
          "border-border bg-white text-foreground dark:border-white/7 dark:bg-[#111111] dark:text-white/96",
        )}
        onClick={() => {
          if (!isExpanded) setOpen(true)
        }}
      >
        <button
          type="button"
          aria-label="Filter assets"
          className={cn(
            "flex shrink-0 items-center justify-center",
            isExpanded ? "pointer-events-none mr-2 size-5" : "size-10",
          )}
          onClick={() => setOpen(true)}
        >
          <SearchIcon className={cn(isExpanded ? "size-5" : "size-6")} />
        </button>

        {isExpanded ? (
          <input
            ref={inputRef}
            aria-label="Filter assets"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Filter assets"
            className="min-w-0 flex-1 bg-transparent text-[14px] font-normal tracking-[-0.03em] outline-none placeholder:text-muted-foreground/65 dark:placeholder:text-white/35"
          />
        ) : null}
      </div>
    </div>
  )
}

function FilterCheckIcon({ checked, dark }: { checked: boolean; dark: boolean }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
        checked
          ? "border-[#01AACF] bg-[#01AACF] text-white"
          : dark
            ? "border-white/55 bg-transparent text-transparent"
            : "border-black/35 bg-transparent text-transparent",
      )}
    >
      <svg aria-hidden="true" viewBox="0 0 12 12" fill="none" className="size-3">
        <path d="M2.5 6.2 4.8 8.5 9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function SingleSelectDropdown({
  allLabel,
  value,
  options,
  onChange,
  ariaLabel,
}: {
  allLabel: string
  value: string | null
  options: Array<{ label: string; value: string }>
  onChange: (nextValue: string | null) => void
  ariaLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const [panelStyle, setPanelStyle] = useState<{
    left: number
    top: number
    width: number
    maxHeight: number
  } | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const triggerLabel = options.find((option) => option.value === value)?.label ?? allLabel

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true)
    return () => document.removeEventListener("pointerdown", handlePointerDown, true)
  }, [open])

  useEffect(() => {
    if (!open) return

    const updatePanelPosition = () => {
      if (!rootRef.current || !panelRef.current) return

      const triggerRect = rootRef.current.getBoundingClientRect()
      const panelHeight = panelRef.current.offsetHeight
      const spaceBelow = window.innerHeight - triggerRect.bottom
      const spaceAbove = triggerRect.top
      const nextOpenUpward = spaceBelow < panelHeight + 12 && spaceAbove > spaceBelow
      const width = Math.min(216, window.innerWidth - 16)
      const left = Math.max(8, triggerRect.right - width)
      const maxHeight = Math.max(140, Math.min(220, (nextOpenUpward ? spaceAbove : spaceBelow) - 12))
      const top = nextOpenUpward
        ? Math.max(8, triggerRect.top - Math.min(panelHeight, maxHeight) - 8)
        : Math.min(window.innerHeight - Math.min(panelHeight, maxHeight) - 8, triggerRect.bottom + 8)

      setOpenUpward(nextOpenUpward)
      setPanelStyle({ left, top, width, maxHeight })
    }

    updatePanelPosition()

    const updateAnchoredPosition = () => {
      if (!rootRef.current || !panelRef.current) return

      const triggerRect = rootRef.current.getBoundingClientRect()
      const panelHeight = panelRef.current.offsetHeight
      const width = Math.min(216, window.innerWidth - 16)
      const left = Math.max(8, triggerRect.right - width)
      const availableSpace = openUpward ? triggerRect.top : window.innerHeight - triggerRect.bottom
      const maxHeight = Math.max(140, Math.min(220, availableSpace - 12))
      const top = openUpward
        ? Math.max(8, triggerRect.top - Math.min(panelHeight, maxHeight) - 8)
        : Math.min(window.innerHeight - Math.min(panelHeight, maxHeight) - 8, triggerRect.bottom + 8)

      setPanelStyle({ left, top, width, maxHeight })
    }

    window.addEventListener("resize", updateAnchoredPosition)
    window.addEventListener("scroll", updateAnchoredPosition, true)

    return () => {
      window.removeEventListener("resize", updateAnchoredPosition)
      window.removeEventListener("scroll", updateAnchoredPosition, true)
    }
  }, [open, openUpward, options.length])

  return (
    <div ref={rootRef} className="relative z-20">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-[12px] px-3.5 text-[13px] font-medium tracking-[-0.03em] shadow-elev-1 outline-none transition-colors focus-visible:ring-2 md:h-10 md:px-4 md:text-[14px]",
          isDark
            ? "border border-white/8 bg-[#1f1f1f] text-white hover:bg-[#262626] focus-visible:ring-white/10"
            : "border border-border bg-white text-foreground hover:bg-neutral-50 focus-visible:ring-black/10",
        )}
      >
        <span className="whitespace-nowrap">{triggerLabel}</span>
        <span className={cn(isDark ? "text-white/70" : "text-foreground/55")}>
          <ChevronDownIcon />
        </span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label={`Close ${ariaLabel}`}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default bg-transparent"
          />

          <div
            ref={panelRef}
            className={cn(
              "fixed z-30 overflow-hidden rounded-[14px] border shadow-[0_22px_44px_rgba(0,0,0,0.24)]",
              isDark ? "border-white/8 bg-[#232323] text-white" : "border-border bg-white text-foreground",
            )}
            style={
              panelStyle
                ? {
                    left: panelStyle.left,
                    top: panelStyle.top,
                    width: panelStyle.width,
                    maxHeight: panelStyle.maxHeight,
                  }
                : undefined
            }
          >
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
              className={cn(
                "flex h-10 w-full items-center gap-3 px-3.5 text-left text-[13px] font-medium tracking-[-0.03em] transition-colors md:h-11 md:px-4 md:text-[14px]",
                isDark ? "text-white hover:bg-white/5" : "text-foreground hover:bg-black/[0.04]",
              )}
            >
              <FilterCheckIcon checked={value === null} dark={isDark} />
              <span>{allLabel}</span>
            </button>

            <div className={cn("w-full border-t", isDark ? "border-white/20" : "border-black/12")} />

            <div className="overflow-y-auto py-1 pb-3" style={panelStyle ? { maxHeight: panelStyle.maxHeight - 41 } : undefined}>
              {options.map((option) => {
                const checked = value === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                    className={cn(
                      "flex h-9 w-full items-center gap-3 px-3.5 text-left text-[13px] tracking-[-0.03em] transition-colors",
                      isDark
                        ? checked
                          ? "bg-white/6 font-medium text-white"
                          : "text-white/82 hover:bg-white/5"
                        : checked
                          ? "bg-black/[0.05] font-medium text-foreground"
                          : "text-foreground/82 hover:bg-black/[0.04]",
                    )}
                  >
                    <FilterCheckIcon checked={checked} dark={isDark} />
                    <span className="truncate">{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

export function TabsBar({
  currentTab,
  onTabChange,
  search,
  onSearchChange,
  selectedDexes,
  onDexChange,
}: TabsBarProps) {
  const selectedDex = Array.from(selectedDexes)[0] ?? null

  return (
    <div className="z-30">
      <div className="hidden items-center gap-4 py-2.5 md:flex">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex min-w-max items-center gap-6">
            {TAB_ORDER.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "whitespace-nowrap text-[22px] font-normal tracking-[-0.03em] transition-colors md:text-[24px]",
                  currentTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground/80",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <SingleSelectDropdown
            allLabel="All DEX"
            value={selectedDex}
            options={BORROW_DEXES.map((dex) => ({ label: dex.label, value: dex.id }))}
            onChange={(nextValue) => {
              const nextDex = (nextValue as BorrowDexId | null) ?? null
              onDexChange(nextDex)
            }}
            ariaLabel="Filter DEX"
          />

          <ExpandableDesktopSearch value={search} onChange={onSearchChange} />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto py-2.5 md:hidden">
        <label className="flex h-10 min-w-[11rem] flex-1 items-center gap-2 rounded-full border border-border bg-white px-3 text-foreground shadow-elev-1 transition-colors focus-within:border-foreground/20 dark:border-white/7 dark:bg-[#111111] dark:text-white/96 dark:focus-within:border-white/18">
          <SearchIcon />
          <input
            aria-label="Filter assets"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Filter assets"
            className="w-full min-w-0 bg-transparent text-[13px] font-normal tracking-[-0.03em] outline-none"
          />
        </label>

        <div className="flex shrink-0 items-center gap-2">
          <SingleSelectDropdown
            allLabel="All Markets"
            value={currentTab}
            options={TAB_ORDER.map((tab) => ({ label: tab.label, value: tab.id }))}
            onChange={(nextValue) => {
              const nextTab = (nextValue as BorrowTabId | null) ?? "all-markets"
              onTabChange(nextTab)
            }}
            ariaLabel="Filter market"
          />

          <SingleSelectDropdown
            allLabel="All DEX"
            value={selectedDex}
            options={BORROW_DEXES.map((dex) => ({ label: dex.label, value: dex.id }))}
            onChange={(nextValue) => {
              const nextDex = (nextValue as BorrowDexId | null) ?? null
              onDexChange(nextDex)
            }}
            ariaLabel="Filter DEX"
          />
        </div>
      </div>
    </div>
  )
}
