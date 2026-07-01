"use client"

import { Check, Globe2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LANGUAGE_OPTIONS, useDisplayPreferences } from "./display-preferences"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

export function LanguageSwitcher({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { language, setLanguage } = useDisplayPreferences()
  const { t } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("Change language")}
          title={t("Language")}
          className={cn(
            "inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-surface-inset px-2.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted dark:bg-surface-2",
            compact && "size-10 px-0",
            className,
          )}
        >
          <Globe2 className="h-4 w-4 text-brand-readable" />
          {compact ? null : <span>{language}</span>}
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
            {option.code === language ? <Check className="h-4 w-4 text-brand" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
