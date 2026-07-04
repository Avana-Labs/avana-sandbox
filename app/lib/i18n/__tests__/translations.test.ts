import { describe, expect, it } from "vitest"
import { translate } from "@/app/lib/i18n/translations"

const ONBOARDING_LANGS = ["ZH", "ES", "AR", "DE", "HI", "TR", "NL", "FR", "ID", "JA", "KO", "PT", "RU"] as const

describe("onboarding translations", () => {
  it("translates the onboarding introduction", () => {
    expect(translate("ES", "Welcome to the Avana Sandbox")).not.toBe("Welcome to the Avana Sandbox")
    expect(translate("ES", "Unlimited practice funds")).toBe("Fondos de práctica ilimitados")
    expect(translate("FR", "No real assets involved")).not.toBe("No real assets involved")
  })

  it.each(ONBOARDING_LANGS)("translates the current onboarding strings in %s", (language) => {
    // Current onboarding copy (post dollar-figure removal). Excludes product-name/loanword
    // exceptions kept in English by design ("Multiply"; "Wallet"/"Lending" in DE/NL).
    const keys = [
      "Welcome to the Avana Sandbox",
      "Unlimited practice funds",
      "No transactions to sign",
      "No real assets involved",
      "Get started",
      "Fund my sandbox",
      "Continue to allocation",
      "Share on X first",
      "I posted it",
      "Open dashboard",
      "Your practice funds are now in your wallet. Jump into the dashboard to start exploring.",
    ]

    for (const key of keys) {
      expect(translate(language, key)).not.toBe(key)
    }
  })
})

describe("action translations", () => {
  it("translates generated success and receipt copy", () => {
    expect(translate("ES", "Deposit successful")).toBe("Depósito completado")
    expect(translate("ES", "12.0000 EURC processed.")).toBe("12.0000 EURC procesado.")
    expect(translate("FR", "Receipt")).toBe("Reçu")
    expect(translate("JA", "Multiply successful")).toBe("レバレッジ 成功")
  })
})
