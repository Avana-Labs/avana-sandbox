import { describe, expect, it } from "vitest"
import { assertBorrowSystemInvariants } from "@/app/lib/credit-engine"
import { deserializeBorrowSystemState, serializeBorrowSystemState } from "@/app/lib/borrow-system/codec"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"

describe("borrow system codec", () => {
  it("round-trips canonical borrow state through a serializable session seed", () => {
    const state = buildMockBorrowSystemState("demo-wallet")
    const encoded = serializeBorrowSystemState(state)
    const decoded = deserializeBorrowSystemState(encoded)

    expect(decoded).toEqual(state)
    assertBorrowSystemInvariants(decoded)
  })
})
