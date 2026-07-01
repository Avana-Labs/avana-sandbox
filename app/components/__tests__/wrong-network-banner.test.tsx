import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Passthrough translator with {chain} placeholder support, mirroring translate().
vi.mock("@/app/lib/i18n/use-translation", () => ({
  useTranslation: () => ({ t: (key: string) => key, language: "en" }),
}))

const state = {
  isWrongNetwork: false,
  targetChainName: "Ethereum",
  targetChainId: 1,
  isSwitching: false,
  switchError: null as string | null,
  switchToTargetChain: vi.fn(),
}

vi.mock("@/app/lib/web3/use-wrong-network", () => ({
  useWrongNetwork: () => state,
}))

import { WrongNetworkBanner } from "../wrong-network-banner"

function reset() {
  state.isWrongNetwork = false
  state.isSwitching = false
  state.switchError = null
  state.switchToTargetChain = vi.fn()
}

describe("WrongNetworkBanner", () => {
  afterEach(() => {
    cleanup()
    reset()
  })

  it("renders nothing on the correct network", () => {
    reset()
    const { container } = render(<WrongNetworkBanner />)
    expect(container.firstChild).toBeNull()
  })

  it("shows a switch prompt when on the wrong network", () => {
    reset()
    state.isWrongNetwork = true
    render(<WrongNetworkBanner />)
    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(screen.getByText("Wrong network")).toBeInTheDocument()
    // {chain} placeholder is interpolated with the target chain name.
    expect(screen.getByText("Switch to Ethereum")).toBeInTheDocument()
  })

  it("triggers a chain switch when the button is clicked", () => {
    reset()
    state.isWrongNetwork = true
    const spy = vi.fn()
    state.switchToTargetChain = spy
    render(<WrongNetworkBanner />)
    fireEvent.click(screen.getByRole("button", { name: "Switch to Ethereum" }))
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it("disables the button and shows progress while switching", () => {
    reset()
    state.isWrongNetwork = true
    state.isSwitching = true
    render(<WrongNetworkBanner />)
    const button = screen.getByRole("button")
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent("Switching…")
  })

  it("surfaces a switch rejection error", () => {
    reset()
    state.isWrongNetwork = true
    state.switchError = "User rejected the request."
    render(<WrongNetworkBanner />)
    expect(screen.getByText("User rejected the request.")).toBeInTheDocument()
  })
})
