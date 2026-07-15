import type { DashboardTabKey } from "@/app/lib/action-system/dashboard-routing"

const SECTION_ID_BY_TAB: Partial<Record<DashboardTabKey, string>> = {
  lending: "dashboard-lend-account",
  overview: "dashboard-borrow-account",
  looping: "dashboard-multiply-account",
}

export function focusDashboardProduct(tab: DashboardTabKey): boolean {
  const sectionId = SECTION_ID_BY_TAB[tab]
  if (!sectionId) return false
  const section = document.getElementById(sectionId)
  if (!section) return false
  section.scrollIntoView({ block: "start" })
  section.focus({ preventScroll: true })
  return true
}
