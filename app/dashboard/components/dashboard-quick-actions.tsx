"use client"

import { useRouter } from "next/navigation"
import { ActionIcon } from "@/app/components/action-icon"
import { actionPagePath, type ActionKind, type ActionProduct } from "@/app/lib/action-system/contracts"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

type QuickAction = {
  id: string
  label: string
  product: ActionProduct
  kind: ActionKind
  primary?: boolean
}

// Top-of-dashboard quick actions (Aave-style). Desktop: compact pill row matching
// the table action chips. Mobile: icon-on-top / label-below tiles in a 4-up row.
const QUICK_ACTIONS: readonly QuickAction[] = [
  { id: "deposit", label: "Deposit", product: "lend", kind: "deposit", primary: true },
  { id: "borrow", label: "Borrow", product: "borrow", kind: "borrow" },
  { id: "repay", label: "Repay", product: "borrow", kind: "repay" },
  { id: "withdraw", label: "Withdraw", product: "lend", kind: "withdraw" },
]

export function DashboardQuickActions({ returnHref }: { returnHref?: string }) {
  const router = useRouter()
  const { t } = useTranslation()

  return (
    <section
      aria-label={t("Quick actions")}
      className="grid grid-cols-4 gap-2 [&_svg]:size-5 sm:flex sm:flex-wrap sm:items-center sm:[&_svg]:size-3.5"
    >
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.id}
          type="button"
          aria-label={t(action.label)}
          onClick={() =>
            router.push(actionPagePath(action.product, action.kind, returnHref ? { return: returnHref } : undefined))
          }
          className={cn(
            "inline-flex flex-col items-center justify-center gap-1.5 rounded-radius-md px-2 py-2.5 text-[11px] font-medium transition-colors",
            "sm:flex-row sm:gap-1.5 sm:rounded-full sm:px-3 sm:py-1.5 sm:text-[13px]",
            action.primary
              ? "bg-brand text-brand-foreground hover:bg-brand/90"
              : "border border-border bg-surface-inset text-foreground hover:bg-surface-hover dark:border-white/10",
          )}
        >
          <ActionIcon label={action.label} />
          <span className="whitespace-nowrap">{t(action.label)}</span>
        </button>
      ))}
    </section>
  )
}
