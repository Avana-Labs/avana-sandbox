import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { TestnetMetricsBadge } from "../testnet-metrics-badge"

describe("TestnetMetricsBadge", () => {
  it("renders its label while keeping decorative sparkles hidden from assistive technology", () => {
    const { container } = render(<TestnetMetricsBadge />)

    expect(screen.getByText("Testnet")).toBeInTheDocument()
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(4)
  })
})
