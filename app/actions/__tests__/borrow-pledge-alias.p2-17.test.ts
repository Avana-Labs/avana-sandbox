import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { isValidAction, normalizeActionKind } from "@/app/lib/action-system/contracts"

describe("borrow pledge vocabulary", () => {
  it("P2-17: maps /actions/borrow/pledge to supply and adds borrow txn filters", () => {
    expect(normalizeActionKind("borrow", "pledge")).toBe("supply")
    expect(isValidAction("borrow", "pledge")).toBe(true)

    const history = readFileSync(
      resolve(__dirname, "../../borrow/_detail/pool-sections/CollateralHistoryCard.tsx"),
      "utf8",
    )
    expect(history).toMatch(/id: "borrow", label: "Borrow"/)
    expect(history).toMatch(/id: "repay", label: "Repay"/)

    const client = readFileSync(
      resolve(__dirname, "../../components/action-page/borrow-action-page-client.tsx"),
      "utf8",
    )
    expect(client).toMatch(/Pledge LP collateral before you can borrow against this market/)
  })
})
