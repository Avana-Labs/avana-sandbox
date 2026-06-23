import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { buildMultiplyPageData } from "@/app/lib/multiply-system/read-model"
import { MultiplyClient } from "@/app/multiply/multiply-client"

const push = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

vi.mock("@/app/multiply/components/explore-loops-markets-table", () => ({
  ExploreLoopsMarketsTable: (props: { onOpenMultiply: (href: string) => void }) => (
    <button type="button" onClick={() => props.onOpenMultiply("/multiply/markets/aave-gho")}>
      open-multiply-action
    </button>
  ),
}))

vi.mock("@/app/multiply/components/multiply-hero", () => ({
  MultiplyHero: () => <div>multiply-hero</div>,
}))

describe("MultiplyClient action routing", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("routes multiply actions to the shared action page", () => {
    const pageData = buildMultiplyPageData("wallet-1")

    render(<MultiplyClient pageData={pageData} />)

    fireEvent.click(screen.getByText("open-multiply-action"))
    expect(push).toHaveBeenCalledWith("/actions/multiply/multiply?market=aave-gho")
  })
})
