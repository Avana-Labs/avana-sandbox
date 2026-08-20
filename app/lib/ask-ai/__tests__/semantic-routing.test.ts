import { describe, expect, it } from "vitest"
import { fallbackAskAIRoute } from "../semantic-routing"

describe("Ask AI conversational fallback routing", () => {
  it("carries the previous position intent into a short follow-up", () => {
    expect(fallbackAskAIRoute("Why?", [{ role: "user", text: "What is my health factor?" }])).toMatchObject({
      allowed: true,
      category: "position_risk",
      intent: "risk",
      confidence: 0.7,
    })
  })

  it("keeps ambiguous first turns allowed", () => {
    expect(fallbackAskAIRoute("Reconcile the blue ideas", [])).toMatchObject({
      allowed: true,
      intent: "education",
      confidence: 0.5,
    })
  })

  it("keeps casual greetings out of the portfolio route", () => {
    expect(fallbackAskAIRoute("sup", [])).toMatchObject({
      allowed: true,
      category: "avana",
      intent: "education",
      confidence: 0.99,
    })
  })

  it("routes a direct liquidation question to risk after casual conversation", () => {
    expect(
      fallbackAskAIRoute("will i get liquidated?", [
        { role: "user", text: "sup" },
        { role: "assistant", text: "Good to see you. What would you like to look at?" },
        { role: "user", text: "?" },
      ]),
    ).toMatchObject({ allowed: true, category: "position_risk", intent: "risk" })
  })

  it("does not inherit a rejected topic", () => {
    expect(fallbackAskAIRoute("Why?", [{ role: "user", text: "Who won the NBA Finals?" }])).toMatchObject({
      allowed: true,
      confidence: 0.5,
    })
  })
})
