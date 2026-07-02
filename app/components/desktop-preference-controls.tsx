"use client"

import Link from "next/link"
import { Check, ChevronLeft, ChevronRight, CircleHelp, Coins, Eye, EyeOff, Globe2, MoonStar, MoreHorizontal, Shield, SunMedium } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { CurrencyFlag } from "./currency-flag"
import { CURRENCY_OPTIONS, LANGUAGE_OPTIONS, useDisplayPreferences } from "./display-preferences"
import { useTheme } from "./theme-provider"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { useEffect, useState } from "react"
import { AVANA_EXTERNAL_LINKS } from "./external-links"

const triggerClassName =
  "inline-flex size-10 items-center justify-center rounded-full border border-border/80 bg-background/85 text-foreground outline-none transition-colors hover:bg-surface-inset focus:outline-none focus-visible:outline-none dark:bg-[#141414] dark:hover:bg-[#1b1b1b] [-webkit-tap-highlight-color:transparent]"

type PreferencesView = "root" | "language" | "currency"

export function DesktopPreferenceControls() {
  const { currency, language, setCurrency, setLanguage, showDollarAmounts, setShowDollarAmounts } = useDisplayPreferences()
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
          <MoreHorizontal className="size-5" strokeWidth={2.1} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={12} className="w-[320px] rounded-[26px] border-border/70 bg-background/95 p-2.5 shadow-2xl backdrop-blur dark:bg-[#121212]/95">
        {view === "root" ? (
          <>
            <DropdownMenuLabel className="px-3 py-2 text-[15px] font-medium normal-case tracking-normal text-foreground">
              Global preferences
            </DropdownMenuLabel>
            <div className="space-y-2 px-3 pb-2">
              <div className="flex items-center justify-between gap-3 rounded-[22px] border border-border/70 bg-surface-inset/50 px-3 py-2.5 dark:bg-[#181818]">
                <span className="text-[14px] text-muted-foreground">Theme</span>
                <div className="flex items-center overflow-hidden rounded-full border border-border bg-background dark:bg-[#111111]">
                  <button
                    type="button"
                    onClick={() => setTheme("system")}
                    className={`px-3.5 py-1.5 text-[13px] font-medium ${
                      mounted && theme === "system" ? "bg-surface-inset text-foreground dark:bg-[#232323]" : "text-muted-foreground"
                    }`}
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`px-2.5 py-1.5 text-[13px] font-medium ${
                      mounted && resolvedTheme === "light" ? "bg-surface-inset text-foreground dark:bg-[#232323]" : "text-muted-foreground"
                    }`}
                  >
                    <SunMedium className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`px-2.5 py-1.5 text-[13px] font-medium ${
                      mounted && resolvedTheme === "dark" ? "bg-surface-inset text-foreground dark:bg-[#232323]" : "text-muted-foreground"
                    }`}
                  >
                    <MoonStar className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <DropdownMenuSeparator />
            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="flex items-center gap-2 text-[14px] text-muted-foreground">
                {showDollarAmounts ? <Eye className="h-4 w-4 text-muted-foreground" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                {t("Dollar amounts")}
              </span>
              <Switch checked={showDollarAmounts} onCheckedChange={setShowDollarAmounts} aria-label="Toggle dollar amounts" />
            </div>
            <DropdownMenuItem
              className="flex cursor-pointer items-center justify-between rounded-[18px] px-3 py-3 text-[14px]"
              onSelect={(event) => {
                event.preventDefault()
                setView("language")
              }}
            >
              <span className="flex items-center gap-2 text-muted-foreground">
                <Globe2 className="h-4 w-4" />
                <span>{t("Language")}</span>
              </span>
              <span className="flex items-center gap-2 font-medium text-foreground">
                {currentLanguage.label}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex cursor-pointer items-center justify-between rounded-[18px] px-3 py-3 text-[14px]"
              onSelect={(event) => {
                event.preventDefault()
                setView("currency")
              }}
            >
              <span className="flex items-center gap-2 text-muted-foreground">
                <Coins className="h-4 w-4" />
                <span>{t("Currency")}</span>
              </span>
              <span className="flex items-center gap-2 font-medium text-foreground">
                {currentCurrency.code}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="rounded-[18px] px-3 py-3 text-[14px]">
              <Link href="/support-center" className="flex items-center gap-2">
                <CircleHelp className="h-4 w-4 text-muted-foreground" />
                {t("Support center")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-[18px] px-3 py-3 text-[14px]">
              <a href={AVANA_EXTERNAL_LINKS.privacy} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                Security & privacy
              </a>
            </DropdownMenuItem>
          </>
        ) : null}

        {view === "language" ? (
          <>
            <DropdownMenuLabel className="flex items-center gap-1 px-2 py-2 text-[15px] font-medium normal-case tracking-normal text-foreground">
              <button
                type="button"
                onClick={() => setView("root")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground transition hover:bg-surface-inset dark:hover:bg-[#1d1d1d]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span>Language</span>
            </DropdownMenuLabel>
            <div className="max-h-[min(420px,60dvh)] overflow-y-auto">
              {LANGUAGE_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.code}
                  className="flex cursor-pointer items-center justify-between rounded-[18px] px-3 py-3 text-[14px]"
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
            <DropdownMenuLabel className="flex items-center gap-1 px-2 py-2 text-[15px] font-medium normal-case tracking-normal text-foreground">
              <button
                type="button"
                onClick={() => setView("root")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground transition hover:bg-surface-inset dark:hover:bg-[#1d1d1d]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span>Currency</span>
            </DropdownMenuLabel>
            <div className="max-h-[min(420px,60dvh)] overflow-y-auto">
              {CURRENCY_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.code}
                  className="flex cursor-pointer items-center justify-between rounded-[18px] px-3 py-3 text-[14px]"
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
