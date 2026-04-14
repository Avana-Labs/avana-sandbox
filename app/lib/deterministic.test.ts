import { createSeededRandom, getDeterministicAmount, hashString } from "@/app/lib/deterministic"

describe("deterministic helpers", () => {
  it("creates stable hashes for the same input", () => {
    expect(hashString("avana")).toBe(hashString("avana"))
    expect(hashString("avana")).not.toBe(hashString("borrow"))
  })

  it("returns the same random sequence for the same seed", () => {
    const first = createSeededRandom("pool-seed")
    const second = createSeededRandom("pool-seed")

    expect([first(), first(), first()]).toEqual([second(), second(), second()])
  })

  it("keeps deterministic amounts within the requested range", () => {
    const amount = getDeterministicAmount("eth-usdc", 10, 20)

    expect(amount).toBeGreaterThanOrEqual(10)
    expect(amount).toBeLessThanOrEqual(20)
    expect(amount).toBe(getDeterministicAmount("eth-usdc", 10, 20))
  })
})
