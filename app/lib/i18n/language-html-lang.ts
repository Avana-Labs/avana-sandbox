import type { LanguageCode } from "@/app/components/display-preferences"

/**
 * Map our language codes to a valid BCP-47 tag for the document `lang` attribute and for
 * Intl formatting. Kept in its own tiny module (NOT in translations.ts) so importing it does
 * not drag the ~288KB of 13-locale dictionaries into the caller's bundle — those load lazily
 * via `use-translation` only when a non-English language is active.
 */
export const LANGUAGE_HTML_LANG: Record<LanguageCode, string> = {
  EN: "en",
  ZH: "zh-Hans",
  ES: "es",
  AR: "ar",
  DE: "de",
  HI: "hi",
  TR: "tr",
  NL: "nl",
  FR: "fr",
  ID: "id",
  JA: "ja",
  KO: "ko",
  PT: "pt",
  RU: "ru",
}
