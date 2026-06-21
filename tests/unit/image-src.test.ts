import { describe, expect, it } from "vitest"
import { hasImageSrc, resolveImageSrc } from "@/lib/image-src"

describe("resolveImageSrc", () => {
  it("returns the first non-empty candidate", () => {
    expect(resolveImageSrc("", "  ", "/icon.svg")).toBe("/icon.svg")
    expect(resolveImageSrc(null, undefined, "/fallback.svg")).toBe("/fallback.svg")
  })

  it("returns null when all candidates are empty", () => {
    expect(resolveImageSrc("", "  ", null, undefined)).toBeNull()
  })
})

describe("hasImageSrc", () => {
  it("rejects empty and whitespace-only values", () => {
    expect(hasImageSrc("")).toBe(false)
    expect(hasImageSrc("   ")).toBe(false)
    expect(hasImageSrc(null)).toBe(false)
  })

  it("accepts non-empty sources", () => {
    expect(hasImageSrc("/asset-icons/eth.svg")).toBe(true)
  })
})
