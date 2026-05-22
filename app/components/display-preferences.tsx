"use client"

import type { ReactNode } from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"

const STORAGE_KEY = "avana-show-dollar-amounts"

type DisplayPreferencesContextValue = {
  showDollarAmounts: boolean
  setShowDollarAmounts: (value: boolean) => void
  toggleShowDollarAmounts: () => void
}

const DisplayPreferencesContext = createContext<DisplayPreferencesContextValue | null>(null)

export function DisplayPreferencesProvider({ children }: { children: ReactNode }) {
  const [showDollarAmounts, setShowDollarAmountsState] = useState(true)
  const hydratedRef = useRef(false)

  useEffect(() => {
    const storedValue = window.localStorage.getItem(STORAGE_KEY)
    if (storedValue === "false") {
      setShowDollarAmountsState(false)
    }
    if (storedValue === "true") {
      setShowDollarAmountsState(true)
    }

    hydratedRef.current = true
  }, [])

  useEffect(() => {
    if (!hydratedRef.current) {
      return
    }

    window.localStorage.setItem(STORAGE_KEY, showDollarAmounts ? "true" : "false")
  }, [showDollarAmounts])

  const setShowDollarAmounts = useCallback((value: boolean) => {
    setShowDollarAmountsState(value)
  }, [])

  const toggleShowDollarAmounts = useCallback(() => {
    setShowDollarAmountsState((currentValue) => !currentValue)
  }, [])

  const value = useMemo(
    () => ({
      showDollarAmounts,
      setShowDollarAmounts,
      toggleShowDollarAmounts,
    }),
    [setShowDollarAmounts, showDollarAmounts, toggleShowDollarAmounts],
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
