import { describe, expect, test } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("Ask AI market job policy", () => {
  test("keeps provider networking out of the chat and Agent paths", () => {
    const agent = readFileSync(resolve("convex/askAIAgent.ts"), "utf8")
    const askAI = readFileSync(resolve("convex/askAI.ts"), "utf8")
    expect(agent).not.toMatch(/fetch\s*\(/)
    expect(askAI).not.toMatch(/fetch\s*\(/)
  })

  test("schedules every normalized market source through Convex", () => {
    const crons = readFileSync(resolve("convex/crons.ts"), "utf8")
    for (const source of ["defillama", "coingecko", "uniswap", "curve", "balancer", "aave"]) {
      expect(crons).toContain(`source: "${source}"`)
    }
  })
})
