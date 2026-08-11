import type { AboutCard, QuickStat } from "@/app/lib/borrow-detail"
import type { ProtocolParameterRow } from "@/app/lib/borrow-detail/protocol-parameters"
import { resolveBorrowDetailMetricHelp } from "@/app/lib/borrow-detail/metric-help"

type ParameterInput = Pick<ProtocolParameterRow, "id" | "label" | "value"> | Pick<QuickStat, "id" | "label" | "value">

function sourceFor(title: string, index: number) {
  const normalized = title.toLowerCase()
  if (normalized.includes("deploy")) return "Deployment"
  if (normalized.includes("list") || normalized.includes("onboard")) return "Market onboarding"
  if (normalized.includes("review") || normalized.includes("refresh")) return "Risk parameter review"
  return index === 0 ? "Latest update" : "Protocol note"
}

export function withGovernanceParameterView(about: AboutCard, parameters: readonly ParameterInput[]): AboutCard {
  if (about.governanceParameters || parameters.length === 0) return about

  return {
    ...about,
    governanceParameters: {
      parameters: parameters.map((parameter) => ({
        id: parameter.id,
        label: parameter.label,
        value: parameter.value,
        description: resolveBorrowDetailMetricHelp(parameter.label),
      })),
      changelog: about.history.slice(0, 3).map((entry, index) => ({
        id: `${entry.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
        parameter: entry.title,
        previous: "—",
        current: entry.description ?? "Updated",
        date: entry.date,
        source: sourceFor(entry.title, index),
        executor: entry.title.toLowerCase().includes("deploy") ? "Deployment executor" : "Governance executor",
      })),
    },
  }
}
