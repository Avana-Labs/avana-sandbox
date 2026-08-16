import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/app/lib/i18n/use-translation", () => ({
  useTranslation: () => ({ t: (key: string) => key, language: "en" }),
}))

import { HomeWorkspaceSkeleton } from "@/app/components/loading-states"

describe("HomeWorkspaceSkeleton placeholder policy", () => {
  afterEach(cleanup)

  it("uses the neutral '—' placeholder, never a fake '$0.00' that reads as real data", () => {
    const { container } = render(<HomeWorkspaceSkeleton />)

    expect(container.textContent).not.toContain("$0.00")
    // The Sell + Buy field value lines both fall back to the em-dash placeholder.
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2)
  })
})
