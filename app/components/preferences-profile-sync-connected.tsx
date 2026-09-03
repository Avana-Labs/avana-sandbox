"use client"

import { useMutation, useQuery } from "convex/react"
import { useEffect, useRef } from "react"
import { api } from "@/convex/_generated/api"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import { useTheme } from "@/app/components/theme-provider"
import {
  applyRemotePreferences,
  normalizePreferences,
  serializePreferences,
  snapshotLocalPreferences,
  type StoredPreferences,
} from "@/app/components/preferences-sync"

export function PreferencesProfileSyncConnected({ wallet }: { wallet: string }) {
  const { theme, setTheme } = useTheme()
  const { language, setLanguage, currency, setCurrency, showDollarAmounts, setShowDollarAmounts } =
    useDisplayPreferences()
  const profile = useQuery(api.wallet.profiles.getMine, {}) as { preferences?: StoredPreferences } | null | undefined
  const savePreferences = useMutation(api.wallet.profiles.savePreferences)
  const initializedWalletRef = useRef<string | null>(null)
  const lastSavedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (profile === undefined || initializedWalletRef.current === wallet) return
    const remote = normalizePreferences(profile?.preferences)
    const local = { theme, language, currency, showDollarAmounts }
    const setters = { setTheme, setLanguage, setCurrency, setShowDollarAmounts }
    if (remote) {
      lastSavedKeyRef.current = serializePreferences(remote)
      applyRemotePreferences(remote, local, setters)
    } else {
      const localPreferences = snapshotLocalPreferences(local)
      lastSavedKeyRef.current = serializePreferences(localPreferences)
      void savePreferences({ preferences: localPreferences }).catch((error: unknown) => {
        lastSavedKeyRef.current = null
        if (process.env.NODE_ENV !== "production") {
          console.warn("[preferences-sync] failed to persist initial preferences to Convex:", error)
        }
      })
    }
    initializedWalletRef.current = wallet
  }, [
    currency,
    language,
    savePreferences,
    setCurrency,
    setLanguage,
    setShowDollarAmounts,
    setTheme,
    showDollarAmounts,
    profile,
    theme,
    wallet,
  ])

  useEffect(() => {
    if (initializedWalletRef.current !== wallet) return
    const nextPreferences = snapshotLocalPreferences({ theme, language, currency, showDollarAmounts })
    const nextKey = serializePreferences(nextPreferences)
    if (nextKey === lastSavedKeyRef.current) return
    const timeoutId = window.setTimeout(() => {
      lastSavedKeyRef.current = nextKey
      void savePreferences({ preferences: nextPreferences }).catch((error: unknown) => {
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
