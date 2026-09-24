import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { TickerPriceFlip } from "@/app/lib/ui/token-ticker-price-label"

afterEach(cleanup)

describe("TickerPriceFlip", () => {
  it("renders the ticker face and the detail face for a named token", () => {
    const { container } = render(<TickerPriceFlip symbol="eth" name="Ethereum" detail="$2,690.97" />)
    expect(container.textContent).toContain("ETH")
    expect(container.textContent).toContain("$2,690.97")
  })

  it("shows only the detail when the name already is the ticker", () => {
    const { container } = render(<TickerPriceFlip symbol="OP" name="OP" detail="$0.131793" />)
    expect(container.textContent).toBe("$0.131793")
  })

  it("shows only the ticker when there is no detail", () => {
    const { container } = render(<TickerPriceFlip symbol="USDT" name="Tether USD" detail={undefined} />)
    expect(container.textContent).toBe("USDT")
  })
})
