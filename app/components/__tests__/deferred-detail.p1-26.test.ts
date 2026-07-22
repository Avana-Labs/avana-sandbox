import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("DeferredDetailContent", () => {
  it("p1-26: default placeholder is compact, not a 1200px gray slab", () => {
    const source = readFileSync(resolve(__dirname, "../detail-page-primitives.tsx"), "utf8")
    expect(source).not.toMatch(/min-h-\[1200px\]/)
    expect(source).toMatch(/min-h-\[120px\]/)
    expect(source).toMatch(/animate-pulse/)
  })
})
