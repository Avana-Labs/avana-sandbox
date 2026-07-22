import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("CategoryChips scroll affordance", () => {
  it("P2-04: keeps chip labels intact with horizontal scroll instead of mid-label clip", () => {
    const source = readFileSync(resolve(__dirname, "../category-chips.tsx"), "utf8")
    expect(source).toMatch(/flex-nowrap/)
    expect(source).toMatch(/overflow-x-auto/)
    expect(source).toMatch(/whitespace-nowrap/)
    expect(source).not.toMatch(/truncate/)
  })
})
