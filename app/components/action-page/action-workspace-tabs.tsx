"use client"

import { useTranslation } from "@/app/lib/i18n/use-translation"
import { PillTabStrip } from "@/app/components/tab-primitives"
import { ActionIcon } from "@/app/components/action-icon"
import { cn } from "@/lib/utils"

export type ActionWorkspaceTabItem = {
  id: string
  label: string
  action?: string
}

const REVEAL_TAB_WIDTH_BY_ACTION: Record<string, string> = {
  borrow: "data-[state=active]:w-[99px]",
  swap: "data-[state=active]:w-[94px]",
  stake: "data-[state=active]:w-[92px]",
  repay: "data-[state=active]:w-[92px]",
  claim: "data-[state=active]:w-[92px]",
  cooldown: "data-[state=active]:w-[124px]",
  unstake: "data-[state=active]:w-[106px]",
  remove: "data-[state=active]:w-[104px]",
  deposit: "data-[state=active]:w-[101px]",
  supply: "data-[state=active]:w-[101px]",
  withdraw: "data-[state=active]:w-[117px]",
  pledge: "data-[state=active]:w-[98px]",
  multiply: "data-[state=active]:w-[103px]",
  deleverage: "data-[state=active]:w-[128px]",
}

export function ActionWorkspaceTabs({
  items,
  value,
  onChange,
  ariaLabel,
  className,
  withIcons = false,
  revealLabels = false,
}: {
  items: ActionWorkspaceTabItem[]
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  className?: string
  withIcons?: boolean
  revealLabels?: boolean
}) {
  const { t } = useTranslation()

  return (
    <PillTabStrip
      items={items.map((item) => {
        const label = t(item.label)
        const action = item.action ?? item.id
        return {
          ...item,
          label: withIcons ? (
            <span className="inline-flex items-center gap-2.5">
              <ActionIcon label={action} className="size-5" />
              <span className={revealLabels ? "home-reveal-tab-label" : undefined}>{label}</span>
            </span>
          ) : (
            label
          ),
        }
      })}
      value={value}
      onChange={onChange}
      ariaLabel={t(ariaLabel)}
      className={className}
      tabClassName={
        revealLabels
          ? cn(
              "home-reveal-tab h-10 w-10 overflow-hidden px-0 py-2 text-[14px] font-bold text-muted-foreground data-[state=active]:px-3.5 [&_svg]:size-4",
              REVEAL_TAB_WIDTH_BY_ACTION[items.find((item) => item.id === value)?.action ?? value] ??
                "data-[state=active]:w-[112px]",
            )
          : withIcons
            ? "px-3.5 py-2 text-[14px] font-bold text-muted-foreground sm:px-3.5 sm:text-[14px] data-[state=active]:bg-neutral-200 data-[state=active]:text-foreground dark:data-[state=active]:bg-neutral-800 [&_svg]:size-4"
            : undefined
      }
      cssOnly={revealLabels}
    />
  )
}
