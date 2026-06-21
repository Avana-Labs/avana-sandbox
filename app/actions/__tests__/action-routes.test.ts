import { describe, expect, it } from "vitest"
import { actionPagePath, getActionDescriptor } from "@/app/lib/action-system/contracts"

describe("action routes", () => {
  const products = [
    ["borrow", "borrow"],
    ["borrow", "repay"],
    ["borrow", "supply"],
    ["borrow", "remove"],
    ["borrow", "claim"],
    ["lend", "deposit"],
    ["lend", "withdraw"],
    ["multiply", "multiply"],
    ["multiply", "deleverage"],
    ["rewards", "claim"],
  ] as const

  it.each(products)("defines route %s/%s", (product, kind) => {
    expect(actionPagePath(product, kind)).toBe(`/actions/${product}/${kind}`)
    expect(getActionDescriptor(product, kind).primaryVerb.length).toBeGreaterThan(0)
  })
})
