import { describe, expect, it } from "vitest"
import { translate } from "@/app/lib/i18n/translations"

/**
 * Terminology guard for the "Multiply" PRODUCT NAME.
 *
 * "Multiply" is a product/nav label, not the finance common-noun "leverage".
 * Several locales historically rendered the nav label as their word for
 * leverage (DE "Hebel", RU "Плечо", JA "レバレッジ", ZH "杠杆", KO "레버리지"),
 * which reads as a different product. This suite pins the specific known-bad
 * values as forbidden for the product label so the regression cannot return.
 *
 * Scope is deliberately narrow: it asserts the exact leverage words are ABSENT
 * for the product-label key rather than prescribing a full glossary. Keys whose
 * English source is the common noun "Leverage" are intentionally NOT covered —
 * those still translate to the leverage word by design.
 */

// The canonical Multiply product/nav label key (t("Multiply") at the nav +
// dashboard + market-detail callsites).
const MULTIPLY_LABEL_KEY = "Multiply"

// The leverage common-noun each locale must NOT use for the product label.
const FORBIDDEN_LEVERAGE_WORD: Record<string, string> = {
  DE: "Hebel",
  RU: "Плечо",
  JA: "レバレッジ",
  ZH: "杠杆",
  KO: "레버리지",
}

describe("terminology: Multiply is a product name, not 'leverage'", () => {
  it.each(Object.entries(FORBIDDEN_LEVERAGE_WORD))(
    "%s renders the Multiply label as the product name, not the leverage word",
    (lang, leverageWord) => {
      const value = translate(lang as never, MULTIPLY_LABEL_KEY)
      expect(value).not.toBe(leverageWord)
    },
  )

  it("localizes the Multiply product label in CJK locales (not the English fallback)", () => {
    // The three CJK locales carry a real localized product form, so the label
    // must not fall through to the English source string.
    for (const lang of ["JA", "ZH", "KO"] as const) {
      expect(translate(lang, MULTIPLY_LABEL_KEY)).not.toBe(MULTIPLY_LABEL_KEY)
    }
  })

  it("resolves a couple of core action terms in representative locales", () => {
    // Sanity that core glossary terms localize where a non-loanword form exists.
    // (Swap is kept as an English loanword in FR/DE/ES by design, so it is only
    // asserted where it genuinely localizes.)
    expect(translate("JA", "Swap")).not.toBe("Swap")
    expect(translate("ZH", "Swap")).not.toBe("Swap")
    expect(translate("FR", "Deposit")).not.toBe("Deposit")
    expect(translate("DE", "Deposit")).not.toBe("Deposit")
    expect(translate("ES", "Deposit")).not.toBe("Deposit")
  })
})
