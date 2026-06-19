import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { buildBorrowSessionSeed } from "@/app/lib/borrow-system/demo-session"
import { useAvanaSession } from "@/app/lib/avana-session"
import { buildLendSessionSeed } from "@/app/lib/lend-system/demo-session"
import { buildMultiplySessionSeed } from "@/app/lib/multiply-system/demo-session"

describe("useAvanaSession", () => {
  it("returns shared wallet identity and independent product session seeds", () => {
    const { result } = renderHook(() => useAvanaSession("demo-wallet"))

    expect(result.current.walletId).toBe("demo-wallet")
    expect(result.current.walletAddress).toMatch(/^0x/i)
    expect(result.current.sandboxMode).toBe(true)
    expect(result.current.borrowSessionSeed).toBe(buildBorrowSessionSeed("demo-wallet"))
    expect(result.current.multiplySessionSeed).toBe(buildMultiplySessionSeed("demo-wallet"))
    expect(result.current.lendSessionSeed).toBe(buildLendSessionSeed("demo-wallet"))
    expect(result.current.borrowSessionSeed).not.toBe(result.current.multiplySessionSeed)
    expect(result.current.borrowSessionSeed).not.toBe(result.current.lendSessionSeed)
  })
})
