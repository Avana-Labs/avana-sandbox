import { describe, expect, it } from "vitest"
import { translate } from "@/app/lib/i18n/translations"

describe("onboarding translations", () => {
  it("translates the complete onboarding introduction", () => {
    expect(translate("ES", "Welcome to the Avana Sandbox.")).toBe("Te damos la bienvenida al Sandbox de Avana.")
    expect(
      translate(
        "ES",
        "Borrow against LP, lend, and loop positions with practice funds. When you're ready, switch to the real world. Have fun exploring.",
      ),
    ).not.toContain("Borrow against LP")
    expect(translate("ES", "Unlimited practice funds")).toBe("Fondos de práctica ilimitados")
    expect(translate("FR", "No real assets involved")).toBe("Aucun actif réel")
  })

  it.each(["AR", "DE", "HI", "TR"] as const)("translates every onboarding introduction string in %s", (language) => {
    const keys = [
      "Welcome to the Avana Sandbox.",
      "A risk-free space to test the app and learn how it works.",
      "Borrow against LP, lend, and loop positions with practice funds. When you're ready, switch to the real world. Have fun exploring.",
      "Unlimited practice funds",
      "Risk-free exploration",
      "No real assets involved",
      "Fast — no transactions to sign",
      "Get started",
      "Fund my sandbox",
      "Continue to allocation",
      "Share on X first",
      "I posted it",
      "Open dashboard",
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
