import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const push = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

vi.mock("@/app/lib/i18n/use-translation", () => ({
  useTranslation: () => ({ t: (key: string) => key, language: "en" }),
}))

vi.mock("@/app/lib/page-loading", () => ({
  triggerPageLoading: vi.fn(),
}))

import { SearchCommand } from "@/app/components/search-command"

describe("SearchCommand keyboard navigation", () => {
  afterEach(() => {
    cleanup()
    push.mockReset()
  })

  const openAndLoad = async () => {
    render(<SearchCommand />)
    fireEvent.click(screen.getByRole("button", { name: "Search Avana" }))
    // Results load via dynamic import; wait until at least one option appears.
    await waitFor(() => expect(screen.getAllByRole("option").length).toBeGreaterThan(0))
    return screen.getByRole("combobox")
  }

  it("navigates results with ArrowDown/ArrowUp and opens with Enter", async () => {
    const input = await openAndLoad()

    const optionsBefore = screen.getAllByRole("option")
    expect(optionsBefore[0]).toHaveAttribute("aria-selected", "true")

    fireEvent.keyDown(input, { key: "ArrowDown" })
    const optionsAfterDown = screen.getAllByRole("option")
    expect(optionsAfterDown[0]).toHaveAttribute("aria-selected", "false")
    expect(optionsAfterDown[1]).toHaveAttribute("aria-selected", "true")

    fireEvent.keyDown(input, { key: "ArrowUp" })
    const optionsAfterUp = screen.getAllByRole("option")
    expect(optionsAfterUp[0]).toHaveAttribute("aria-selected", "true")

    fireEvent.keyDown(input, { key: "Enter" })
    expect(push).toHaveBeenCalledTimes(1)
    expect(push.mock.calls[0][0]).toBeTruthy()
  })

  it("keeps a valid active item after typing a query", async () => {
    const input = await openAndLoad()

    fireEvent.change(input, { target: { value: "usdc" } })
    await waitFor(() => expect(screen.getAllByRole("option").length).toBeGreaterThan(0))

    // First result is active after re-filtering.
    const options = screen.getAllByRole("option")
    expect(options[0]).toHaveAttribute("aria-selected", "true")

    fireEvent.keyDown(input, { key: "Enter" })
    expect(push).toHaveBeenCalledTimes(1)
  })

  it("labels a pool's fee tier as a 'pool fee' to distinguish it from the annualized borrow Fees APR", async () => {
    await openAndLoad()

    // Pool result subtitles read like "Venue / 0.30% pool fee / …" so the swap
    // fee tier isn't confused with the annualized "Fees" APR on borrow tables.
    await waitFor(() => expect(screen.getAllByText(/pool fee/i).length).toBeGreaterThan(0))
  })

  it("closes on a single Escape even when a query is present", async () => {
    const input = await openAndLoad()

    fireEvent.change(input, { target: { value: "usdc" } })
    await waitFor(() => expect(screen.getAllByRole("option").length).toBeGreaterThan(0))

    fireEvent.keyDown(input, { key: "Escape" })

    // One Escape must dismiss the dialog outright (no residual combobox/options).
    await waitFor(() => expect(screen.queryByRole("combobox")).not.toBeInTheDocument())
    expect(screen.queryAllByRole("option")).toHaveLength(0)
  })
})
