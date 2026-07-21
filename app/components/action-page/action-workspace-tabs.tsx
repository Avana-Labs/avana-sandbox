"use client"

import { useTranslation } from "@/app/lib/i18n/use-translation"
import { PillTabStrip } from "@/app/components/tab-primitives"
import { ActionIcon } from "@/app/components/action-icon"

export type ActionWorkspaceTabItem = {
  id: string
  label: string
}

export function ActionWorkspaceTabs({
  items,
  value,
  onChange,
  ariaLabel,
  className,
  withIcons = false,
}: {
  items: ActionWorkspaceTabItem[]
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  className?: string
  withIcons?: boolean
}) {
  const { t } = useTranslation()

  return (
    <PillTabStrip
      items={items.map((item) => {
        const label = t(item.label)
        return {
          ...item,
          label: withIcons ? (
            <span className="inline-flex items-center gap-2.5">
              <ActionIcon label={label} className="size-5" />
              <span>{label}</span>
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
        withIcons
          ? "px-3.5 py-2 text-[14px] font-bold text-muted-foreground sm:px-3.5 sm:text-[14px] data-[state=active]:bg-neutral-200 data-[state=active]:text-foreground dark:data-[state=active]:bg-neutral-800 [&_svg]:size-4"
          : undefined
      }
    />
  )
}
