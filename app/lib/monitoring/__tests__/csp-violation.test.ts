import { describe, expect, it } from "vitest"
import { describeBlockedEval } from "../csp-violation"

const violation = {
  disposition: "enforce" as const,
  blockedURI: "eval",
  effectiveDirective: "script-src",
  sourceFile: "https://user:password@app.avana.cc/_next/static/chunks/wallet.js?token=secret#private",
  lineNumber: 234,
  columnNumber: 30,
}

describe("blocked eval diagnostics", () => {
  it("preserves the caller location without credentials or query data", () => {
    expect(describeBlockedEval(violation)).toEqual({
      source_file: "https://app.avana.cc/_next/static/chunks/wallet.js",
      line_number: 234,
      column_number: 30,
      directive: "script-src",
    })
  })

  it("preserves an extension source when the browser identifies it", () => {
    expect(
      describeBlockedEval({ ...violation, sourceFile: "chrome-extension://wallet/injected.js" })?.source_file,
    ).toBe("chrome-extension://wallet/injected.js")
  })

  it.each(["", "<anonymous>", "data:text/javascript,private-code"])(
    "does not send script contents: %s",
    (sourceFile) => {
      expect(describeBlockedEval({ ...violation, sourceFile })?.source_file).toBe("<anonymous>")
    },
  )

  it("ignores report-only and unrelated policy events", () => {
    expect(describeBlockedEval({ ...violation, disposition: "report" })).toBeNull()
    expect(describeBlockedEval({ ...violation, blockedURI: "inline" })).toBeNull()
    expect(describeBlockedEval({ ...violation, effectiveDirective: "connect-src" })).toBeNull()
  })
})
