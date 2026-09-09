import { ActionPageClient } from "@/app/components/action-page/action-page-client"
import { LighthouseAuditSurface } from "@/app/components/lighthouse-audit-surface"
import type { ActionKind, ActionProduct } from "@/app/lib/action-system/contracts"
import { resolveActionCloseHref } from "@/app/lib/action-system/contracts"
import { buildSeoMetadata } from "@/app/lib/seo-metadata"
import { isLighthouseAuditMode } from "@/app/lib/test-mode"
import type { Metadata } from "next"

type PageProps = {
  params: Promise<{ product: ActionProduct; kind: ActionKind }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function readParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined
}

const ACTION_TITLES: Record<ActionProduct, Partial<Record<ActionKind, string>>> = {
  borrow: {
    borrow: "Borrow",
    repay: "Repay",
    supply: "Pledge collateral",
    remove: "Remove collateral",
    claim: "Claim fees",
  },
  lend: {
    deposit: "Lend deposit",
    withdraw: "Lend withdraw",
  },
  multiply: {
    multiply: "Multiply",
    deleverage: "Deleverage",
    close: "Close position",
  },
  rewards: {
    claim: "Claim rewards",
  },
  umbrella: {
    stake: "Umbrella stake",
    unstake: "Umbrella unstake",
    claim: "Claim Umbrella rewards",
    cooldown: "Umbrella cooldown",
  },
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { product, kind } = await params
  const title = ACTION_TITLES[product]?.[kind] ?? `${product} ${kind}`
  return buildSeoMetadata({
    title,
    description: `Complete your ${title.toLowerCase()} transaction on Avana.`,
    path: `/actions/${product}/${kind}`,
  })
}

export default async function ActionPage({ params, searchParams }: PageProps) {
  const { product, kind } = await params
  const query = await searchParams

  if (isLighthouseAuditMode()) {
    return <LighthouseAuditSurface title={kind} eyebrow={product} />
  }

  return (
    <ActionPageClient
      product={product}
      kind={kind}
      closeHref={resolveActionCloseHref(product, readParam(query.return))}
      initialAssetId={readParam(query.asset)}
      initialMarketId={readParam(query.market)}
      initialAmount={readParam(query.amount)}
      initialMultiplier={readParam(query.multiplier)}
      initialPositionId={readParam(query.position)}
      initialDebtId={readParam(query.debt)}
    />
  )
}
