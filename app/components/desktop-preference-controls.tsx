"use client"

import { Check, ChevronLeft, ChevronRight, Coins, Globe2, MoonStar, MoreHorizontal, SunMedium } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CurrencyFlag } from "./currency-flag"
import { CURRENCY_OPTIONS, LANGUAGE_OPTIONS, useDisplayPreferences } from "./display-preferences"
import { useTheme } from "./theme-provider"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { useEffect, useState } from "react"

const triggerClassName =
  "inline-flex size-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground outline-none transition-colors hover:bg-surface-inset hover:text-foreground focus:outline-none focus-visible:outline-none dark:bg-[#181818] dark:text-white/72 dark:hover:bg-[#222222] dark:hover:text-white [-webkit-tap-highlight-color:transparent]"

type PreferencesView = "root" | "language" | "currency"

export function DesktopPreferenceControls() {
  const { currency, language, setCurrency, setLanguage } = useDisplayPreferences()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const { t } = useTranslation()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<PreferencesView>("root")

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentLanguage = LANGUAGE_OPTIONS.find((option) => option.code === language) ?? LANGUAGE_OPTIONS[0]
  const currentCurrency = CURRENCY_OPTIONS.find((option) => option.code === currency) ?? CURRENCY_OPTIONS[0]

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setView("root")
      }}
    >
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={t("Open preferences")} title={t("Preferences")} className={triggerClassName}>
          <MoreHorizontal className="size-5" strokeWidth={2.35} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-[296px] rounded-[22px] border border-border bg-background/98 p-2 text-foreground shadow-2xl backdrop-blur dark:border-white/10 dark:bg-[#121212]/98 dark:text-white"
      >
        {view === "root" ? (
          <>
            <DropdownMenuLabel className="px-3 py-2.5 text-[16px] font-medium normal-case tracking-normal text-foreground dark:text-white">
              {t("Global preferences")}
            </DropdownMenuLabel>
            <div className="space-y-2 px-3 pb-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[14px] text-muted-foreground dark:text-white/64">{t("Theme")}</span>
                <div className="flex items-center overflow-hidden rounded-full border border-border bg-surface p-1 dark:border-white/12 dark:bg-[#1a1a1a]">
                  <button
                    type="button"
                    onClick={() => setTheme("system")}
                    className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${
                      mounted && theme === "system"
                        ? "bg-foreground text-background dark:bg-[#2a2a2a] dark:text-white"
                        : "text-muted-foreground dark:text-white/64"
                    }`}
                  >
                    {t("Auto")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`rounded-full px-2.5 py-1.5 text-[13px] font-medium ${
                      mounted && resolvedTheme === "light"
                        ? "bg-foreground text-background dark:bg-[#2a2a2a] dark:text-white"
                        : "text-muted-foreground dark:text-white/64"
                    }`}
                  >
                    <SunMedium className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`rounded-full px-2.5 py-1.5 text-[13px] font-medium ${
                      mounted && resolvedTheme === "dark"
                        ? "bg-foreground text-background dark:bg-[#2a2a2a] dark:text-white"
                        : "text-muted-foreground dark:text-white/64"
                    }`}
                  >
                    <MoonStar className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex cursor-pointer items-center justify-between rounded-[16px] px-3 py-3 text-[14px] text-foreground outline-none hover:bg-surface focus:bg-surface dark:text-white dark:hover:bg-[#1d1d1d] dark:focus:bg-[#1d1d1d]"
              onSelect={(event) => {
                event.preventDefault()
                setView("language")
              }}
            >
              <span className="flex items-center gap-2 text-muted-foreground dark:text-white/64">
                <Globe2 className="h-4 w-4" />
                <span>{t("Language")}</span>
              </span>
              <span className="flex items-center gap-2 font-medium text-foreground dark:text-white">
                {currentLanguage.label}
                <ChevronRight className="h-4 w-4 text-muted-foreground dark:text-white/52" />
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex cursor-pointer items-center justify-between rounded-[16px] px-3 py-3 text-[14px] text-foreground outline-none hover:bg-surface focus:bg-surface dark:text-white dark:hover:bg-[#1d1d1d] dark:focus:bg-[#1d1d1d]"
              onSelect={(event) => {
                event.preventDefault()
                setView("currency")
              }}
            >
              <span className="flex items-center gap-2 text-muted-foreground dark:text-white/64">
                <Coins className="h-4 w-4" />
                <span>{t("Currency")}</span>
              </span>
              <span className="flex items-center gap-2 font-medium text-foreground dark:text-white">
                {currentCurrency.code}
                <ChevronRight className="h-4 w-4 text-muted-foreground dark:text-white/52" />
              </span>
            </DropdownMenuItem>
          </>
        ) : null}

        {view === "language" ? (
          <>
            <DropdownMenuLabel className="flex items-center gap-1 px-1 py-1.5 text-[14px] font-medium normal-case tracking-normal text-foreground dark:text-white">
              <button
                type="button"
                onClick={() => setView("root")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground transition hover:bg-surface dark:text-white dark:hover:bg-[#1d1d1d]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span>{t("Language")}</span>
            </DropdownMenuLabel>
            <div className="max-h-[min(420px,60dvh)] overflow-y-auto">
              {LANGUAGE_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.code}
                  className="flex cursor-pointer items-center justify-between rounded-[16px] px-3 py-2.5 text-[14px] text-foreground outline-none hover:bg-surface focus:bg-surface dark:text-white dark:hover:bg-[#1d1d1d] dark:focus:bg-[#1d1d1d]"
                  onSelect={(event) => {
                    event.preventDefault()
                    setLanguage(option.code)
                    setView("root")
                  }}
                >
                  <span>{option.label}</span>
                  {option.code === language ? <Check className="h-4 w-4 text-brand" /> : null}
                </DropdownMenuItem>
              ))}
            </div>
          </>
        ) : null}

        {view === "currency" ? (
          <>
            <DropdownMenuLabel className="flex items-center gap-1 px-1 py-1.5 text-[14px] font-medium normal-case tracking-normal text-foreground dark:text-white">
              <button
                type="button"
                onClick={() => setView("root")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground transition hover:bg-surface dark:text-white dark:hover:bg-[#1d1d1d]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span>{t("Currency")}</span>
            </DropdownMenuLabel>
            <div className="max-h-[min(420px,60dvh)] overflow-y-auto">
              {CURRENCY_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.code}
                  className="flex cursor-pointer items-center justify-between rounded-[16px] px-3 py-2.5 text-[14px] text-foreground outline-none hover:bg-surface focus:bg-surface dark:text-white dark:hover:bg-[#1d1d1d] dark:focus:bg-[#1d1d1d]"
                  onSelect={(event) => {
                    event.preventDefault()
                    setCurrency(option.code)
                    setView("root")
                  }}
                >
                  <span className="flex items-center gap-2">
                    <CurrencyFlag code={option.code} className="size-5" />
                    {option.label}
                  </span>
                  {option.code === currency ? <Check className="h-4 w-4 text-brand" /> : null}
                </DropdownMenuItem>
              ))}
            </div>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
