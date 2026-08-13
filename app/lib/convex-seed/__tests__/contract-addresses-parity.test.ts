import { describe, expect, it } from "vitest"

import {
  ASSET_CONTRACT_SEED_ROWS,
  MULTIPLY_CONTRACT_SEED_ROWS,
  POOL_CONTRACT_SEED_ROWS,
} from "../inputs/contract-addresses-seed"

/**
 * The `contractAddressFor` used inside contract-addresses-seed.ts and
 * pool.mock.ts is a file-private function, so this parity test inlines a
 * byte-identical copy of the FNV-1a algorithm documented in both:
 *   - app/lib/borrow-detail/pool.mock.ts (`contractAddressFor`)
 *   - app/lib/convex-seed/build-seed.ts (`contractAddressForSeed`, ~line 778)
 * If the algorithm ever changes, this test catches the drift.
 */
function contractAddressFor(slug: string, salt: string): string {
  const seed = `${slug}:${salt}`
  let hash = 0x811c9dc5
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  const chunk = (hash >>> 0).toString(16).padStart(8, "0").toUpperCase()
  return `0x${chunk}${chunk}${chunk}${chunk}${chunk}`.slice(0, 42)
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const POOL_SALTS = ["vault", "token", "staking", "governance"] as const
const ASSET_SALTS = ["vault", "token", "staking"] as const
const MULTIPLY_SALTS = ["vault", "token", "staking"] as const

describe("POOL_CONTRACT_SEED_ROWS parity", () => {
  it("has 256 rows (64 pools × 4 salts)", () => {
    expect(POOL_CONTRACT_SEED_ROWS.length).toBe(256)
  })

  it("emits exactly the pool salt set per unique slug", () => {
    const bySlug = new Map<string, string[]>()
    for (const row of POOL_CONTRACT_SEED_ROWS) {
      const salts = bySlug.get(row.slug) ?? []
      salts.push(row.salt)
      bySlug.set(row.slug, salts)
    }
    // 64 distinct pool slugs, each with the exact 4-salt set.
    expect(bySlug.size).toBe(64)
    for (const [slug, salts] of bySlug.entries()) {
      expect(salts, `slug ${slug} salt set`).toEqual([...POOL_SALTS])
    }
  })
})

describe("ASSET_CONTRACT_SEED_ROWS parity", () => {
  it("has 192 rows (64 assets × 3 salts)", () => {
    expect(ASSET_CONTRACT_SEED_ROWS.length).toBe(192)
  })

  it("emits exactly the asset salt set per unique slug", () => {
    const bySlug = new Map<string, string[]>()
    for (const row of ASSET_CONTRACT_SEED_ROWS) {
      const salts = bySlug.get(row.slug) ?? []
      salts.push(row.salt)
      bySlug.set(row.slug, salts)
    }
    expect(bySlug.size).toBe(64)
    for (const [slug, salts] of bySlug.entries()) {
      expect(salts, `slug ${slug} salt set`).toEqual([...ASSET_SALTS])
    }
  })
})

describe("MULTIPLY_CONTRACT_SEED_ROWS parity", () => {
  it("has 60 rows (20 markets × 3 salts)", () => {
    expect(MULTIPLY_CONTRACT_SEED_ROWS.length).toBe(60)
  })

  it("emits exactly the multiply salt set per unique slug", () => {
    const bySlug = new Map<string, string[]>()
    for (const row of MULTIPLY_CONTRACT_SEED_ROWS) {
      const salts = bySlug.get(row.slug) ?? []
      salts.push(row.salt)
      bySlug.set(row.slug, salts)
    }
    expect(bySlug.size).toBe(20)
    for (const [slug, salts] of bySlug.entries()) {
      expect(salts, `slug ${slug} salt set`).toEqual([...MULTIPLY_SALTS])
    }
  })
})

describe("address hashing parity (spot check)", () => {
  // Pick 5 arbitrary rows spanning all three seed sets — first + middle + last
  // of the two big sets, plus a couple from multiply. The hash algorithm is
  // deterministic, so a handful of rows catches any drift in the formula.
  const spotChecks = [
    POOL_CONTRACT_SEED_ROWS[0]!,
    POOL_CONTRACT_SEED_ROWS[Math.floor(POOL_CONTRACT_SEED_ROWS.length / 2)]!,
    ASSET_CONTRACT_SEED_ROWS[0]!,
    ASSET_CONTRACT_SEED_ROWS[ASSET_CONTRACT_SEED_ROWS.length - 1]!,
    MULTIPLY_CONTRACT_SEED_ROWS[0]!,
  ]

  for (const [index, row] of spotChecks.entries()) {
    it(`row #${index} (${row.slug}:${row.salt}) matches contractAddressFor + label + href`, () => {
      const expectedAddress = contractAddressFor(row.slug, row.salt)
      expect(row.address).toBe(expectedAddress)
      expect(row.label).toBe(`${expectedAddress.slice(0, 6)}...${expectedAddress.slice(-4)}`)
      expect(row.label).toBe(shortAddress(expectedAddress))
      expect(row.href).toBe(`https://etherscan.io/address/${expectedAddress}`)
      expect(row.isSynthetic).toBe(true)
    })
  }
})
