"use client"

import { useMutation, useQuery } from "convex/react"
import { useEffect, useRef } from "react"
import { api } from "@/convex/_generated/api"
import {
  CURRENCY_OPTIONS,
  LANGUAGE_OPTIONS,
  type CurrencyCode,
  type LanguageCode,
  useDisplayPreferences,
} from "@/app/components/display-preferences"
import { useTheme, type Theme } from "@/app/components/theme-provider"

type StoredPreferences = {
  theme?: Theme
  language?: LanguageCode
  currency?: CurrencyCode
  showDollarAmounts?: boolean
}

function isTheme(value: string | undefined): value is Theme {
  return value === "light" || value === "dark" || value === "system"
}

function isLanguage(value: string | undefined): value is LanguageCode {
  return LANGUAGE_OPTIONS.some((option) => option.code === value)
}

function isCurrency(value: string | undefined): value is CurrencyCode {
  return CURRENCY_OPTIONS.some((option) => option.code === value)
}

function normalizePreferences(preferences: StoredPreferences | null | undefined): StoredPreferences | null {
  if (!preferences) return null
  const normalized: StoredPreferences = {}
  if (isTheme(preferences.theme)) normalized.theme = preferences.theme
  if (isLanguage(preferences.language)) normalized.language = preferences.language
  if (isCurrency(preferences.currency)) normalized.currency = preferences.currency
  if (typeof preferences.showDollarAmounts === "boolean") normalized.showDollarAmounts = preferences.showDollarAmounts
  return Object.keys(normalized).length > 0 ? normalized : null
}

function serializePreferences(preferences: StoredPreferences): string {
  return JSON.stringify({
    theme: preferences.theme ?? null,
    language: preferences.language ?? null,
    currency: preferences.currency ?? null,
    showDollarAmounts: preferences.showDollarAmounts ?? null,
  })
}

export function PreferencesProfileSyncConnected({ wallet }: { wallet: string }) {
  const { theme, setTheme } = useTheme()
  const { language, setLanguage, currency, setCurrency, showDollarAmounts, setShowDollarAmounts } = useDisplayPreferences()
  const state = useQuery(api.sandbox.onboarding.getWalletOnboardingState, { wallet }) as
    | { profile?: { preferences?: StoredPreferences } }
    | undefined
  const savePreferences = useMutation((api as typeof api & { sandbox: { onboarding: { savePreferences: unknown } } }).sandbox.onboarding.savePreferences)
  const initializedWalletRef = useRef<string | null>(null)
  const lastSavedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!state || initializedWalletRef.current === wallet) return
    const remote = normalizePreferences(state.profile?.preferences)
    if (remote) {
      lastSavedKeyRef.current = serializePreferences(remote)
      if (remote.theme && remote.theme !== theme) setTheme(remote.theme)
      if (remote.language && remote.language !== language) setLanguage(remote.language)
      if (remote.currency && remote.currency !== currency) setCurrency(remote.currency)
      if (typeof remote.showDollarAmounts === "boolean" && remote.showDollarAmounts !== showDollarAmounts) {
        setShowDollarAmounts(remote.showDollarAmounts)
      }
    } else {
      const localPreferences: StoredPreferences = { theme, language, currency, showDollarAmounts }
      lastSavedKeyRef.current = serializePreferences(localPreferences)
      void savePreferences({ wallet, preferences: localPreferences }).catch((error: unknown) => {
        lastSavedKeyRef.current = null
        if (process.env.NODE_ENV !== "production") {
          console.warn("[preferences-sync] failed to persist initial preferences to Convex:", error)
        }
      })
    }
    initializedWalletRef.current = wallet
  }, [currency, language, savePreferences, setCurrency, setLanguage, setShowDollarAmounts, setTheme, showDollarAmounts, state, theme, wallet])

  useEffect(() => {
    if (initializedWalletRef.current !== wallet) return
    const nextPreferences: StoredPreferences = { theme, language, currency, showDollarAmounts }
    const nextKey = serializePreferences(nextPreferences)
    if (nextKey === lastSavedKeyRef.current) return
    const timeoutId = window.setTimeout(() => {
      lastSavedKeyRef.current = nextKey
      void savePreferences({ wallet, preferences: nextPreferences }).catch((error: unknown) => {
        lastSavedKeyRef.current = null
        if (process.env.NODE_ENV !== "production") {
          console.warn("[preferences-sync] failed to persist display preferences to Convex:", error)
        }
      })
    }, 250)
    return () => window.clearTimeout(timeoutId)
  }, [currency, language, savePreferences, showDollarAmounts, theme, wallet])

  return null
}
