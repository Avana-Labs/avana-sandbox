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

export function SearchCommandIconPlaceholder({ tone = "nav" }: { tone?: "nav" | "brand" } = {}) {
  return <SearchTrigger iconOnly tone={tone} />
}

function createSearchCommandIconOnly(tone: "nav" | "brand") {
  return dynamic(
    () =>
      import("./search-command").then((mod) => {
        const Component = mod.SearchCommand
        return function SearchCommandIconOnly() {
          return <Component iconOnly tone={tone} />
        }
      }),
    {
      ssr: false,
      loading: () => <SearchCommandIconPlaceholder tone={tone} />,
    },
  )
}

const SearchCommandIconOnlyNav = createSearchCommandIconOnly("nav")
const SearchCommandIconOnlyBrand = createSearchCommandIconOnly("brand")

export function LazySearchCommand() {
  return <SearchCommand />
}

export function LazySearchCommandIconOnly({ tone = "nav" }: { tone?: "nav" | "brand" } = {}) {
  return tone === "brand" ? <SearchCommandIconOnlyBrand /> : <SearchCommandIconOnlyNav />
}
