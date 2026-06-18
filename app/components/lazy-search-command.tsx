"use client"

import dynamic from "next/dynamic"

const SearchCommand = dynamic(
  () => import("./search-command").then((mod) => mod.SearchCommand),
  {
    ssr: false,
    loading: () => (
      <button
        type="button"
        aria-label="Search Avana"
        className="flex h-9 w-full items-center gap-2.5 rounded-full border border-[#e6e6e6] bg-[#fafafa] px-3.5 text-left text-[14px] font-normal tracking-[-0.01em] text-[#767676] shadow-none transition-colors lg:h-10 lg:gap-3 lg:px-4 lg:text-[15px] dark:border-border/60 dark:bg-surface-2 dark:text-muted-foreground"
      >
        <span className="min-w-0 flex-1 truncate">Search pools, borrow, lend, and more</span>
        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-[7px] border border-[#dddddd] bg-[#f5f5f5] px-1 text-[10px] font-normal text-[#7a7a7a] lg:h-[22px] lg:min-w-[22px] lg:text-[11px] dark:border-border/70 dark:bg-surface-inset dark:text-muted-foreground">
          /
        </span>
      </button>
    ),
  },
)

const SearchCommandIconOnly = dynamic(
  () =>
    import("./search-command").then((mod) => {
      const Component = mod.SearchCommand
      return function SearchCommandIconOnly() {
        return <Component iconOnly />
      }
    }),
  {
    ssr: false,
    loading: () => (
      <button
        type="button"
        aria-label="Search Avana"
        className="inline-flex h-10 w-10 items-center justify-center text-[#007a99]"
      >
        <span className="sr-only">Search Avana</span>
      </button>
    ),
  },
)

export function LazySearchCommand() {
  return <SearchCommand />
}

export function LazySearchCommandIconOnly() {
  return <SearchCommandIconOnly />
}
