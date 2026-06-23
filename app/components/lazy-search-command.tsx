"use client"

import dynamic from "next/dynamic"

const searchCommandLoadingButtonClassName =
  "flex h-9 w-full items-center gap-2.5 rounded-full border border-border bg-surface-inset px-3.5 text-left text-[14px] font-normal tracking-[-0.01em] text-muted-foreground shadow-none transition-colors lg:h-10 lg:gap-3 lg:px-4 lg:text-[15px]"

export function SearchCommandPlaceholder() {
  return (
    <button
      type="button"
      aria-label="Search Avana"
      className={searchCommandLoadingButtonClassName}
    >
      <span className="min-w-0 flex-1 truncate">Search pools, borrow, lend, and more</span>
      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-[7px] border border-border bg-muted px-1 text-[10px] font-normal text-brand-readable lg:h-[22px] lg:min-w-[22px] lg:text-[11px]">
        /
      </span>
    </button>
  )
}

const SearchCommand = dynamic(
  () => import("./search-command").then((mod) => mod.SearchCommand),
  {
    ssr: false,
    loading: () => <SearchCommandPlaceholder />,
  },
)

export function SearchCommandIconPlaceholder() {
  return (
    <button
      type="button"
      aria-label="Search Avana"
      className="inline-flex h-10 w-10 items-center justify-center text-brand-readable"
    >
      <span className="sr-only">Search Avana</span>
    </button>
  )
}

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
    loading: () => <SearchCommandIconPlaceholder />,
  },
)

export function LazySearchCommand() {
  return <SearchCommand />
}

export function LazySearchCommandIconOnly() {
  return <SearchCommandIconOnly />
}
