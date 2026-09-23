import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { walletButtonClasses } from "@/app/components/wallet-control-shared"

const read = (file: string) => readFileSync(resolve(__dirname, "..", file), "utf8")

describe("header wallet CTA", () => {
  it.each(["desktop", "mobile"] as const)("is a compact white-text brand button on %s", (size) => {
    const { brand, pill } = walletButtonClasses(size)
    expect(brand).toMatch(/\btext-white\b/)
    expect(brand).not.toMatch(/text-brand-foreground/)
    expect(brand).not.toMatch(/w-\[1(24|36|52)px\]/)
    // The connected address pill keeps its fixed width.
    expect(pill).toMatch(/w-\[/)
  })

  it("says Get Started before a wallet is connected", () => {
    for (const file of ["wallet-control.tsx", "wallet-control-connected.tsx"]) {
      expect(read(file)).not.toMatch(/t\("Connect"\)/)
      expect(read(file)).toMatch(/t\("Get Started"\)/)
    }
  })
})
