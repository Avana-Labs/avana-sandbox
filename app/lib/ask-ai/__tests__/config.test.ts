import { afterEach, describe, expect, it } from "vitest"
import { getAskAIServerConfig } from "../server-config"

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

describe("Ask AI server configuration", () => {
  it("defaults to deterministic mock mode", () => {
    delete process.env.ASK_AI_USE_MOCKS
    delete process.env.ASK_AI_MODEL

    expect(getAskAIServerConfig()).toMatchObject({
      model: "gpt-5.6-luna",
      useMocks: true,
      providers: {
        openAIConfigured: false,
      },
    })
  })

  it("accepts explicit model and output limits", () => {
    process.env.ASK_AI_USE_MOCKS = "false"
    process.env.ASK_AI_MODEL = "test-model"
    process.env.ASK_AI_MAX_OUTPUT_TOKENS = "750"

    expect(getAskAIServerConfig()).toMatchObject({
      model: "test-model",
      useMocks: false,
      maxOutputTokens: 750,
    })
  })

  it("rejects invalid configuration", () => {
    process.env.ASK_AI_USE_MOCKS = "yes"
    expect(() => getAskAIServerConfig()).toThrow("Expected true or false")

    process.env.ASK_AI_USE_MOCKS = "true"
    process.env.ASK_AI_MAX_OUTPUT_TOKENS = "0"
    expect(() => getAskAIServerConfig()).toThrow("Expected a positive integer")
  })
})
