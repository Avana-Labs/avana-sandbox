import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"

describe("ActionMetricHelp", () => {
  it("uses a concise aria-label instead of the full tooltip body", () => {
    render(
      <ActionMetricHelp
        topic="health factor"
        text="Health factor estimates how far your position is from liquidation. Above 1.0 is solvent; below 1.0 can be liquidated."
      />,
    )

    expect(screen.getByRole("button", { name: "More information about health factor" })).toBeInTheDocument()
    expect(
      screen.queryByRole("button", {
        name: "Health factor estimates how far your position is from liquidation. Above 1.0 is solvent; below 1.0 can be liquidated.",
      }),
    ).not.toBeInTheDocument()
  })
})
