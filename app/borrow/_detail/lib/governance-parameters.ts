import type { AboutCard, QuickStat } from "@/app/lib/borrow-detail"
import type { ProtocolParameterRow } from "@/app/lib/borrow-detail/protocol-parameters"

type ParameterInput = Pick<ProtocolParameterRow, "id" | "label" | "value"> | Pick<QuickStat, "id" | "label" | "value">
type GovernanceParameters = NonNullable<AboutCard["governanceParameters"]>
type GovernanceParameter = GovernanceParameters["parameters"][number]

const LEND_RISK_PARAMETERS = [
  {
    id: "ltv",
    label: "Max LTV",
    aliases: ["max ltv", "collateral factor"],
    description: "Maximum borrow power when this market is used as collateral.",
    fallback: "75%",
  },
  {
    id: "liquidationThreshold",
    label: "Liquidation threshold",
    aliases: ["liquidation threshold"],
    description: "Health factor begins breaking down when collateral value crosses this threshold.",
    fallback: "80%",
  },
  {
    id: "supplyCap",
    label: "Supply cap",
    aliases: ["supply cap"],
    description: "Governance-controlled ceiling for deposits into this market.",
    fallback: "$25.0M",
  },
  {
    id: "borrowCap",
    label: "Borrow cap",
    aliases: ["borrow cap"],
    description: "Governance-controlled ceiling for total borrowed liquidity.",
    fallback: "$10.0M",
  },
  {
    id: "liquidationBonus",
    label: "Liquidation bonus",
    aliases: ["liquidation bonus"],
    description: "Incentive paid to liquidators when unhealthy positions are cleared.",
    fallback: "5%",
  },
  {
    id: "oracle",
    label: "Oracle source",
    aliases: ["oracle source", "oracle"],
    description: "Price feed family used by the market risk engine.",
    fallback: "Chainlink",
  },
] as const

function isIrmLabel(label: string) {
  const normalized = label.trim().toLowerCase()
  return (
    normalized.includes("optimal utilization") ||
    normalized.includes("optimal utilisation") ||
    normalized.includes("slope below") ||
    normalized.includes("slope above") ||
    normalized.includes("base borrow")
  )
}

function parsePct(value: string) {
  const numeric = Number.parseFloat(value.replace(/[^0-9.-]/g, ""))
  return Number.isFinite(numeric) ? numeric : null
}

function sourceFor(title: string, index: number) {
  const normalized = title.toLowerCase()
  if (normalized.includes("deploy")) return "Deployment"
  if (normalized.includes("list") || normalized.includes("onboard")) return "Market onboarding"
  if (normalized.includes("review") || normalized.includes("refresh")) return "Risk parameter review"
  return index === 0 ? "Latest update" : "Protocol note"
}

function pickParameter(
  spec: (typeof LEND_RISK_PARAMETERS)[number],
  byId: Map<string, GovernanceParameter>,
  byLabel: Map<string, GovernanceParameter>,
): GovernanceParameter {
  const found = byId.get(spec.id) ?? spec.aliases.map((alias) => byLabel.get(alias)).find(Boolean)
  if (found?.value && !isIrmLabel(found.label)) {
    return {
      id: spec.id,
      label: spec.label,
      value: found.value,
      description: found.description ?? spec.description,
      href: found.href,
      status: found.status,
    }
  }
  return {
    id: spec.id,
    label: spec.label,
    value: spec.fallback,
    description: spec.description,
  }
}

/** Always six lend-style risk parameters. Drops IRM rows and fills any gaps. */
export function normalizeGovernanceParameters(about: AboutCard): GovernanceParameters {
  const incoming = about.governanceParameters?.parameters ?? []
  const usable = incoming.filter((parameter) => !isIrmLabel(parameter.label))
  const byId = new Map(usable.map((parameter) => [parameter.id, parameter]))
  const byLabel = new Map(usable.map((parameter) => [parameter.label.trim().toLowerCase(), parameter]))

  const parameters = LEND_RISK_PARAMETERS.map((spec) => pickParameter(spec, byId, byLabel))
  const ltv = parsePct(parameters[0]?.value ?? "")
  if (ltv != null && parameters[1]?.value === LEND_RISK_PARAMETERS[1].fallback) {
    parameters[1] = {
      ...parameters[1]!,
      value: `${Math.min(95, Math.round((ltv + 5) * 10) / 10)}%`,
    }
  }

  const changelog =
    about.governanceParameters?.changelog.filter((entry) => !isIrmLabel(entry.parameter)).slice(0, 3) ?? []

  return {
    parameters,
    changelog:
      changelog.length > 0
        ? changelog
        : about.history.slice(0, 3).map((entry, index) => ({
            id: `${entry.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
            parameter: entry.title,
            previous: "—",
            current: entry.description ?? "Updated",
            date: entry.date,
            source: sourceFor(entry.title, index),
            executor: entry.title.toLowerCase().includes("deploy") ? "Deployment executor" : "Governance executor",
          })),
  }
}

export function withGovernanceParameterView(about: AboutCard, parameters: readonly ParameterInput[] = []): AboutCard {
  if (about.governanceParameters?.parameters.length) {
    return { ...about, governanceParameters: normalizeGovernanceParameters(about) }
  }

  const seeded: AboutCard = {
    ...about,
    governanceParameters: {
      parameters: parameters
        .filter((parameter) => !isIrmLabel(parameter.label))
        .map((parameter) => ({
          id: parameter.id,
          label: parameter.label,
          value: parameter.value,
        })),
      changelog: [],
    },
  }

  return { ...about, governanceParameters: normalizeGovernanceParameters(seeded) }
}
