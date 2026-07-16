"use client"

import dynamic from "next/dynamic"
import { SearchTrigger } from "./search-trigger"

export function SearchCommandPlaceholder() {
  return <SearchTrigger />
}

const SearchCommand = dynamic(() => import("./search-command").then((mod) => mod.SearchCommand), {
  ssr: false,
  loading: () => <SearchCommandPlaceholder />,
})

export function SearchCommandIconPlaceholder() {
  return <SearchTrigger iconOnly />
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
