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

describe("header home link name", () => {
  it("includes the visible testnet label, so the link's name matches what is on screen", async () => {
    const { readFileSync } = await import("node:fs")
    const { resolve } = await import("node:path")
    const header = readFileSync(resolve(__dirname, "../header.tsx"), "utf8")
    expect(header).not.toMatch(/aria-label=\{t\("Home"\)\}/)
    expect(header).toMatch(/const homeLinkLabel = `\$\{t\("Home"\)\}, \$\{t\("Sandbox · testnet"\)\}`/)
  })
})
