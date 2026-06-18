import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { LendHero } from "../lend-hero"
import { MARKETS } from "../data"

vi.mock("@/app/components/display-preferences", () => ({
  useDisplayPreferences: () => ({ showDollarAmounts: true }),
}))

describe("LendHero", () => {
  it("renders lending metrics", () => {
    const { getByText } = render(<LendHero markets={MARKETS} />)

    expect(getByText("Total TVL")).toBeInTheDocument()
    expect(getByText("$31.4M")).toBeInTheDocument()
    expect(getByText("Average APY")).toBeInTheDocument()
    expect(getByText("8.42%")).toBeInTheDocument()
    expect(getByText("Avg Utilization")).toBeInTheDocument()
    expect(getByText("67.61%")).toBeInTheDocument()
    expect(getByText("Active Markets")).toBeInTheDocument()
    expect(getByText("5")).toBeInTheDocument()
  })
})
