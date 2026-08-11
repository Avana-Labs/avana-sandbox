"use client"

import { Search } from "@/app/components/icons"
import { useTranslation } from "@/app/lib/i18n/use-translation"

// The single source of truth for the header search trigger's markup. Both the
// real SearchCommand and the pre-hydration placeholder (search-command is a
// `ssr: false` dynamic import) render this, so the swap from placeholder to the
// hydrated component is visually seamless — no color/text flash on load.
export function SearchTrigger({
  iconOnly = false,
  // "nav" matches Dashboard / Umbrella muted chrome; "brand" is the phone-only cyan.
  tone = "nav",
  onClick,
}: {
  iconOnly?: boolean
  tone?: "nav" | "brand"
  onClick?: () => void
}) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      aria-label={t("Search Avana")}
      onClick={onClick}
      className={
        iconOnly
          ? tone === "brand"
            ? "inline-flex h-10 w-10 items-center justify-center text-[#01AACF] transition hover:text-[#01AACF]/80 focus-visible:outline-none focus-visible:ring-0 active:scale-95 [-webkit-tap-highlight-color:transparent]"
            : "inline-flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-0 active:scale-95 dark:hover:text-[#7DDCFF] [-webkit-tap-highlight-color:transparent]"
          : "flex h-9 w-full items-center gap-2.5 rounded-full border border-[#e6e6e6] bg-[#fafafa] px-3.5 text-left text-[14px] font-normal tracking-[-0.01em] text-[#767676] shadow-none lg:h-10 lg:gap-3 lg:px-4 lg:text-[15px] dark:border-border/60 dark:bg-surface-2 dark:text-muted-foreground"
      }
    >
      {iconOnly ? (
        <Search className="h-5 w-5" />
      ) : (
        <>
          <Search className="h-4 w-4 shrink-0 text-[#8a8a8a] dark:text-muted-foreground/80 lg:h-[17px] lg:w-[17px]" />
          <span className="min-w-0 flex-1 truncate">{t("Search pools, borrow, and lend")}</span>
          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-[7px] border border-[#dddddd] bg-[#f5f5f5] px-1 text-[10px] font-normal text-[#7a7a7a] lg:h-[22px] lg:min-w-[22px] lg:text-[11px] dark:border-border/70 dark:bg-surface-inset dark:text-muted-foreground">
            /
          </span>
        </>
      )}
    </button>
  )
}
