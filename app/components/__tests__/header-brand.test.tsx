import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { HeaderBrand, MobileHeaderBrand } from "@/app/components/header-brand"

afterEach(() => cleanup())

describe("header brand testnet label", () => {
  it("labels the desktop wordmark as the sandbox testnet", () => {
    render(<HeaderBrand />)
    expect(screen.getByText("Sandbox · testnet")).toBeInTheDocument()
    expect(screen.getByText("Testnet")).toBeInTheDocument()
    expect(screen.getAllByAltText(/Avana logo/).length).toBeGreaterThan(0)
  })

  it("labels the mobile mark with one word", () => {
    render(<MobileHeaderBrand />)
    expect(screen.getByText("Testnet")).toBeInTheDocument()
    expect(screen.queryByText("Sandbox · testnet")).toBeNull()
  })
})
