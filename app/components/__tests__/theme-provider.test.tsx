import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ThemeProvider, useTheme } from "@/app/components/theme-provider"

function ThemeToggle() {
  const { setTheme } = useTheme()
  return (
    <button type="button" onClick={() => setTheme("light")}>
      Light
    </button>
  )
}

describe("ThemeProvider transition guard", () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.classList.remove("dark")
    document.head.querySelectorAll('[data-avana-theme-transition="true"]').forEach((node) => node.remove())
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    cleanup()
    document.documentElement.classList.remove("dark")
  })

  it("removes the global animation guard immediately after applying each theme", async () => {
    render(
      <ThemeProvider defaultTheme="dark" storageKey="theme-provider-test">
        <ThemeToggle />
      </ThemeProvider>,
    )

    await waitFor(() => expect(document.documentElement).toHaveClass("dark"))
    expect(document.head.querySelector('[data-avana-theme-transition="true"]')).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Light" }))

    await waitFor(() => expect(document.documentElement).not.toHaveClass("dark"))
    expect(document.head.querySelector('[data-avana-theme-transition="true"]')).toBeNull()
  })
})
