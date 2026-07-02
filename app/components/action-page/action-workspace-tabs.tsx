"use client"

import { useTranslation } from "@/app/lib/i18n/use-translation"
import { PillTabStrip } from "@/app/components/tab-primitives"

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
}: {
  items: ActionWorkspaceTabItem[]
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  className?: string
}) {
  const { t } = useTranslation()

  return (
    <PillTabStrip
      items={items.map((item) => ({ ...item, label: t(item.label) }))}
      value={value}
      onChange={onChange}
      ariaLabel={t(ariaLabel)}
      className={className}
    />
  )
}
