"use client"

import { useCallback, useEffect, useSyncExternalStore } from "react"
import { useOptionalDisplayPreferences, type LanguageCode } from "@/app/components/display-preferences"

/**
 * The 13-locale dictionary module (~288KB) is loaded ON DEMAND — only when a non-English
 * language is active — so the default English experience ships zero locale data (English is the
 * source language, so `t(key) === key`). Until the bundle lands, a non-English string falls back
 * to its English key — exactly what the app already does for any untranslated string — and when
 * the bundle lands every mounted `useTranslation` re-renders and swaps in the real translation.
 * SSR renders English (no preferences), the client hydrates English, then upgrades: no mismatch.
 */
type TranslateFn = (language: LanguageCode, key: string) => string

let translateFn: TranslateFn | null = null
let loadPromise: Promise<void> | null = null
let version = 0
const listeners = new Set<() => void>()

function ensureLocaleLoaded(language: string) {
  if (language === "EN" || translateFn || loadPromise) return
  loadPromise = import("@/app/lib/i18n/translations")
    .then((m) => {
      translateFn = m.translate
      version += 1
      listeners.forEach((notify) => notify())
    })
    .catch(() => {
      // Keep the English fallback and allow a later retry rather than hard-failing the UI.
      loadPromise = null
    })
}

function subscribe(notify: () => void) {
  listeners.add(notify)
  return () => {
    listeners.delete(notify)
  }
}

/**
 * Returns a `t(englishString)` translator bound to the user's selected language (from the header
 * switcher). English renders synchronously with no locale download; other languages fall back to
 * English until the dictionary bundle loads, then re-render translated.
 */
export function useTranslation() {
  const preferences = useOptionalDisplayPreferences()
  const language = preferences?.language ?? "EN"
  // Re-render when the lazily-loaded dictionary lands (module-level version bump).
  const loadedVersion = useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  )
  useEffect(() => {
    ensureLocaleLoaded(language)
  }, [language])
  const t = useCallback(
    (key: string) => (language === "EN" || !translateFn ? key : translateFn(language, key)),
    [language, loadedVersion],
  )
  return { t, language }
}
