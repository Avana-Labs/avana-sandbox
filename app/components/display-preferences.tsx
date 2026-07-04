"use client"

import type { ReactNode } from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { LANGUAGE_HTML_LANG } from "@/app/lib/i18n/language-html-lang"
import { setActiveCurrency } from "@/app/lib/currency/active-rate"

const STORAGE_KEY = "avana-show-dollar-amounts"
const LANGUAGE_STORAGE_KEY = "avana-language"
const CURRENCY_STORAGE_KEY = "avana-currency"

export const LANGUAGE_OPTIONS = [
  { code: "EN", label: "English" },
  { code: "ZH", label: "Chinese" },
  { code: "ES", label: "Spanish" },
  { code: "AR", label: "Arabic" },
  { code: "DE", label: "German" },
  { code: "HI", label: "Hindi" },
  { code: "TR", label: "Turkish" },
  { code: "NL", label: "Dutch" },
  { code: "FR", label: "French" },
  { code: "ID", label: "Indonesian" },
  { code: "JA", label: "Japanese" },
  { code: "KO", label: "Korean" },
  { code: "PT", label: "Portuguese" },
  { code: "RU", label: "Russian" },
] as const

export const CURRENCY_OPTIONS = [
  { code: "USD", label: "USD", flag: "🇺🇸" },
  { code: "ARS", label: "ARS", flag: "🇦🇷" },
  { code: "AUD", label: "AUD", flag: "🇦🇺" },
  { code: "BRL", label: "BRL", flag: "🇧🇷" },
  { code: "CAD", label: "CAD", flag: "🇨🇦" },
  { code: "CNY", label: "CNY", flag: "🇨🇳" },
  { code: "COP", label: "COP", flag: "🇨🇴" },
  { code: "EUR", label: "EUR", flag: "🇪🇺" },
  { code: "GBP", label: "GBP", flag: "🇬🇧" },
  { code: "HKD", label: "HKD", flag: "🇭🇰" },
  { code: "IDR", label: "IDR", flag: "🇮🇩" },
  { code: "INR", label: "INR", flag: "🇮🇳" },
  { code: "JPY", label: "JPY", flag: "🇯🇵" },
  { code: "KRW", label: "KRW", flag: "🇰🇷" },
] as const

export type LanguageCode = (typeof LANGUAGE_OPTIONS)[number]["code"]
export type CurrencyCode = (typeof CURRENCY_OPTIONS)[number]["code"]

type DisplayPreferencesContextValue = {
  showDollarAmounts: boolean
  setShowDollarAmounts: (value: boolean) => void
  toggleShowDollarAmounts: () => void
  language: LanguageCode
  setLanguage: (value: LanguageCode) => void
  currency: CurrencyCode
  setCurrency: (value: CurrencyCode) => void
}

const DisplayPreferencesContext = createContext<DisplayPreferencesContextValue | null>(null)

export function DisplayPreferencesProvider({ children }: { children: ReactNode }) {
  const [showDollarAmounts, setShowDollarAmountsState] = useState(true)
  const [language, setLanguageState] = useState<LanguageCode>("EN")
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD")
  const hydratedRef = useRef(false)

  useEffect(() => {
    const storedValue = window.localStorage.getItem(STORAGE_KEY)
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    const storedCurrency = window.localStorage.getItem(CURRENCY_STORAGE_KEY) as CurrencyCode | null

    if (storedValue === "false") {
      setShowDollarAmountsState(false)
    }
    if (storedValue === "true") {
      setShowDollarAmountsState(true)
    }
    const migratedLanguage =
      storedLanguage?.startsWith("ES-") ? "ES" : storedLanguage?.startsWith("ZH-") ? "ZH" : storedLanguage
    if (migratedLanguage && LANGUAGE_OPTIONS.some((option) => option.code === migratedLanguage)) {
      setLanguageState(migratedLanguage as LanguageCode)
    }
    if (storedCurrency && CURRENCY_OPTIONS.some((option) => option.code === storedCurrency)) {
      // Update the module-level rate first so the shared USD formatters convert on the
      // very next render (no one-frame lag in the wrong currency).
      setActiveCurrency(storedCurrency)
      setCurrencyState(storedCurrency)
    }

    hydratedRef.current = true
  }, [])

  useEffect(() => {
    if (!hydratedRef.current) {
      return
    }

    window.localStorage.setItem(STORAGE_KEY, showDollarAmounts ? "true" : "false")
  }, [showDollarAmounts])

  useEffect(() => {
    if (!hydratedRef.current) {
      return
    }

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  }, [language])

  // Keep the document language attribute in sync so the browser (and assistive
  // tech) treat the page as the selected locale.
  useEffect(() => {
    document.documentElement.lang = LANGUAGE_HTML_LANG[language] ?? "en"
  }, [language])

  useEffect(() => {
    if (!hydratedRef.current) {
      return
    }

    window.localStorage.setItem(CURRENCY_STORAGE_KEY, currency)
  }, [currency])

  const setShowDollarAmounts = useCallback((value: boolean) => {
    setShowDollarAmountsState(value)
  }, [])

  const toggleShowDollarAmounts = useCallback(() => {
    setShowDollarAmountsState((currentValue) => !currentValue)
  }, [])

  const setLanguage = useCallback((value: LanguageCode) => {
    setLanguageState(value)
  }, [])

  const setCurrency = useCallback((value: CurrencyCode) => {
    // Sync the shared formatters' rate before the state-driven re-render.
    setActiveCurrency(value)
    setCurrencyState(value)
  }, [])

  const value = useMemo(
    () => ({
      showDollarAmounts,
      setShowDollarAmounts,
      toggleShowDollarAmounts,
      language,
      setLanguage,
      currency,
      setCurrency,
    }),
    [currency, language, setCurrency, setLanguage, setShowDollarAmounts, showDollarAmounts, toggleShowDollarAmounts],
  )

  return <DisplayPreferencesContext.Provider value={value}>{children}</DisplayPreferencesContext.Provider>
}

export function useDisplayPreferences() {
  const context = useContext(DisplayPreferencesContext)
  if (!context) {
    throw new Error("useDisplayPreferences must be used within a DisplayPreferencesProvider")
  }

  return context
}

export function useOptionalDisplayPreferences() {
  return useContext(DisplayPreferencesContext)
}
