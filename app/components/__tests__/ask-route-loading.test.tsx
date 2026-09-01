import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const navigation = vi.hoisted(() => ({ pathname: "/ask" }))

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}))

vi.mock("@/app/lib/i18n/use-translation", () => ({
  useTranslation: () => ({ t: (key: string) => key, language: "en" }),
}))

import { RouteContentSkeleton } from "@/app/components/loading-states"

describe("Focused route loading", () => {
  afterEach(cleanup)

  beforeEach(() => {
    navigation.pathname = "/ask"
  })

  it.each(["/ask", "/actions/borrow/borrow"])(
    "does not render the generic product skeleton before %s initializes",
    (pathname) => {
      navigation.pathname = pathname
      const { container } = render(<RouteContentSkeleton />)

      expect(container.querySelector('[data-testid="focused-route-pending"]')).toBeInTheDocument()
      expect(container.querySelector(".skeleton-shimmer")).toBeNull()
    },
  )
})
