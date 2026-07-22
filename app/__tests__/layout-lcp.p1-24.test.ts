import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("root layout LCP", () => {
  it("p1-24: disables blocking font preload on first paint", () => {
    const source = readFileSync(resolve(__dirname, "../layout.tsx"), "utf8")
    expect(source).toMatch(/preload:\s*false/)
    expect(source).not.toMatch(/preload:\s*true/)
  })
})
