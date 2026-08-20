import { describe, expect, it } from "vitest"
import { askAIHref, resolveAskAICloseHref } from "../navigation"

describe("Ask AI navigation", () => {
  it("preserves the launch route", () => {
    expect(askAIHref("/borrow?tab=positions")).toBe("/ask?return=%2Fborrow%3Ftab%3Dpositions")
    expect(resolveAskAICloseHref("/borrow?tab=positions")).toBe("/borrow?tab=positions")
  })

  it.each([null, undefined, "", "https://evil.example", "//evil.example", "/ask", "/ask?thread=1"])(
    "falls back home for unsafe return value %s",
    (returnHref) => expect(resolveAskAICloseHref(returnHref)).toBe("/"),
  )
})
