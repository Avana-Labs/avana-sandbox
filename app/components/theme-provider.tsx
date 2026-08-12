"use client"

import type React from "react"
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react"

export type Theme = "light" | "dark" | "system"

type ThemeContextValue = {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
}

const THEME_STORAGE_KEY = "avana-theme"
const ThemeContext = createContext<ThemeContextValue | null>(null)

function getSystemTheme() {
  if (typeof window === "undefined") {
    return "light" as const
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function getStoredTheme(storageKey: string, fallback: Theme) {
  if (typeof window === "undefined") {
    return fallback
  }

  const storedTheme = window.localStorage.getItem(storageKey) as Theme | null
  if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
    return storedTheme
  }

  return fallback
}

function applyThemeClass(resolvedTheme: "light" | "dark") {
  const root = document.documentElement
  root.classList.toggle("dark", resolvedTheme === "dark")
  root.style.colorScheme = resolvedTheme
}

function disableThemeTransitions() {
  const style = document.createElement("style")
  style.setAttribute("data-avana-theme-transition", "true")
  style.textContent = `
    *,
    *::before,
    *::after {
      transition-property: none !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
      animation: none !important;
    }
  `
  document.head.appendChild(style)

  return () => {
    window.requestAnimationFrame(() => {
      style.remove()
    })
  }
}

type ThemeProviderProps = React.PropsWithChildren<{
  attribute?: string
  defaultTheme?: Theme
  disableTransitionOnChange?: boolean
  enableSystem?: boolean
  storageKey?: string
}>

export function ThemeProvider({
  children,
  defaultTheme = "light",
  disableTransitionOnChange = true,
  storageKey = THEME_STORAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme(storageKey, defaultTheme))
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() => getSystemTheme())
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setThemeState(getStoredTheme(storageKey, defaultTheme))
    setSystemTheme(getSystemTheme())
    setHydrated(true)
  }, [defaultTheme, storageKey])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(storageKey, theme)
  }, [hydrated, storageKey, theme])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => setSystemTheme(getSystemTheme())

    media.addEventListener("change", handleChange)
    return () => media.removeEventListener("change", handleChange)
  }, [])

  const resolvedTheme = theme === "system" ? systemTheme : theme

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    let restoreTransitions: (() => void) | undefined

    if (disableTransitionOnChange) {
      restoreTransitions = disableThemeTransitions()
    }

    applyThemeClass(resolvedTheme)

    return () => {
      restoreTransitions?.()
    }
  }, [disableTransitionOnChange, resolvedTheme])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme: setThemeState,
    }),
    [resolvedTheme, theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}

// Same as useTheme but returns null instead of throwing when no provider is
// mounted, so components that offer a theme toggle can render (without it) in
// contexts that don't wrap ThemeProvider.
export function useThemeOptional() {
  return useContext(ThemeContext)
}
