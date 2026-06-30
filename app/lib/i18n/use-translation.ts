"use client"

import { useCallback } from "react"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import { translate } from "@/app/lib/i18n/translations"

/**
 * Returns a `t(englishString)` translator bound to the user's selected language
 * (from the header switcher). Untranslated strings fall back to English, so it is
 * always safe to wrap a label even before its translation exists.
 */
export function useTranslation() {
  const { language } = useDisplayPreferences()
  const t = useCallback((key: string) => translate(language, key), [language])
  return { t, language }
}
