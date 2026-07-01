"use client"

import { Check, Coins, Globe2, MoonStar, SunMedium } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CurrencyFlag } from "./currency-flag"
import { CURRENCY_OPTIONS, LANGUAGE_OPTIONS, useDisplayPreferences } from "./display-preferences"
import { useTheme } from "./theme-provider"
import { useTranslation } from "@/app/lib/i18n/use-translation"

const triggerClassName =
  "inline-flex size-10 items-center justify-center rounded-full bg-transparent text-[#01AACF] outline-none transition-transform duration-200 hover:-translate-y-px hover:text-[#01AACF]/80 focus:outline-none focus-visible:outline-none [-webkit-tap-highlight-color:transparent]"

export function DesktopPreferenceControls() {
  const { currency, language, setCurrency, setLanguage } = useDisplayPreferences()
  const { resolvedTheme, setTheme } = useTheme()
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label={t("Change language")} title={t("Language")} className={triggerClassName}>
            <Globe2 className="size-5" strokeWidth={1.9} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={10} className="max-h-[min(480px,70dvh)] w-60 overflow-y-auto p-1.5">
          {LANGUAGE_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.code}
              className="flex cursor-pointer items-center justify-between px-2 py-2.5 text-[14px] font-normal"
              onSelect={() => setLanguage(option.code)}
            >
              <span>{option.label}</span>
              {option.code === language ? <Check className="size-4 text-brand" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label={t("Change currency")} title={t("Currency")} className={triggerClassName}>
            <Coins className="size-5" strokeWidth={1.9} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={10} className="max-h-[min(480px,70dvh)] w-52 overflow-y-auto p-1.5">
          {CURRENCY_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.code}
              className="flex cursor-pointer items-center justify-between px-2 py-2.5 text-[14px] font-normal"
              onSelect={() => setCurrency(option.code)}
            >
              <span className="flex items-center gap-2">
                <CurrencyFlag code={option.code} className="size-5" />
                {option.label}
              </span>
              {option.code === currency ? <Check className="size-4 text-brand" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        aria-label={resolvedTheme === "dark" ? t("Switch to light mode") : t("Switch to dark mode")}
        title={resolvedTheme === "dark" ? t("Light mode") : t("Dark mode")}
        className={triggerClassName}
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      >
        {resolvedTheme === "dark" ? <MoonStar className="size-5" strokeWidth={1.9} /> : <SunMedium className="size-5" strokeWidth={1.9} />}
      </button>
    </div>
  )
}
