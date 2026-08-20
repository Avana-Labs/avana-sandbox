import { describe, expect, test } from "vitest"
import { ASK_AI_AGENT_INSTRUCTIONS } from "../../../../convex/askAIAgent"
import { ASK_AI_CONFIG } from "../config"

describe("Ask AI Agent configuration", () => {
  test("uses GPT-5.6 Luna without exposing a model choice", () => {
    expect(ASK_AI_CONFIG.defaultModel).toBe("gpt-5.6-luna")
  })

  test("allows relevant current events and requires authoritative financial tools", () => {
    expect(ASK_AI_AGENT_INSTRUCTIONS).toContain("regulation, and current events")
    expect(ASK_AI_AGENT_INSTRUCTIONS).toContain("Use web search for recent public events")
    expect(ASK_AI_AGENT_INSTRUCTIONS).toContain("deterministic tools")
    expect(ASK_AI_AGENT_INSTRUCTIONS).toContain("Search Avana knowledge")
    expect(ASK_AI_AGENT_INSTRUCTIONS).toContain("Redirect only clearly unrelated requests")
  })

  test("keeps the agent read-only and does not promise forecasts", () => {
    expect(ASK_AI_AGENT_INSTRUCTIONS).toContain("You are read-only")
    expect(ASK_AI_AGENT_INSTRUCTIONS).toContain("uncertain scenarios")
  })
})
