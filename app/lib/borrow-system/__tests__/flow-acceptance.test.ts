import { describe, it } from "vitest"

describe("borrow flow acceptance", () => {
  describe("portfolio page", () => {
    it.todo("renders user portfolio from live read adapter")
    it.todo("renders active collateral and debt positions")
    it.todo("renders collateral value, debt, LTV, health factor, and risk")
    it.todo("rehydrates metrics after simulated actions")
  })

  describe("borrow flow", () => {
    it.todo("opens borrow action with adapter-backed preview")
    it.todo("shows confirmation action box before execution")
    it.todo("completes simulated borrow and shows synthetic receipt")
    it.todo("updates positions after completion")
    it.todo("adds borrow to transaction history")
  })

  describe("repay flow", () => {
    it.todo("opens repay action with adapter preview")
    it.todo("completes simulated repay")
    it.todo("decreases debt and improves health factor")
  })

  describe("withdraw flow", () => {
    it.todo("blocks or warns on unsafe withdraw")
    it.todo("completes safe withdraw and updates collateral")
  })

  describe("liquidation preview", () => {
    it.todo("generates liquidation preview for unhealthy positions")
    it.todo("flags unsafe positions")
    it.todo("does not submit a real or sandbox-persisted transaction")
  })

  describe("action box shell", () => {
    it.todo("shows simulated label on all sandbox action surfaces")
    it.todo("dedupes in-flight submits")
  })
})
