"use client"

import { BrandIcon, BrandLogo } from "./brand-logo"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/app/lib/i18n/use-translation"

// The whole app is the testnet sandbox; the label under the logo says so before a visitor acts.
const TESTNET_LABEL_CLASS = "text-[11px] leading-none tracking-[0.02em] text-brand-text"

function MarkWithLabel({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <span className={cn("inline-flex flex-col items-center gap-0.5", className)}>
      <BrandIcon />
      <span aria-hidden="true" className={TESTNET_LABEL_CLASS}>
        {t("Testnet")}
      </span>
    </span>
  )
}

/** Desktop header brand: the mark below xl, the wordmark from xl, each with its testnet label. */
export function HeaderBrand() {
  const { t } = useTranslation()
  return (
    <>
      <MarkWithLabel className="xl:hidden" />
      <span className="hidden flex-col items-start gap-0.5 xl:inline-flex">
        <BrandLogo visibleFrom="xl" />
        <span aria-hidden="true" className={TESTNET_LABEL_CLASS}>
          {t("Sandbox · testnet")}
        </span>
      </span>
    </>
  )
}

/** Phone header brand: the mark with a one-word testnet label. */
export function MobileHeaderBrand() {
  return <MarkWithLabel />
}
