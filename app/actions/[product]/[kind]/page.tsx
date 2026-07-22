import { ActionPageClient } from "@/app/components/action-page/action-page-client"
import { LighthouseAuditSurface } from "@/app/components/lighthouse-audit-surface"
import type { ActionKind, ActionProduct } from "@/app/lib/action-system/contracts"
import { resolveActionCloseHref } from "@/app/lib/action-system/contracts"
import { isLighthouseAuditMode } from "@/app/lib/test-mode"

type PageProps = {
  params: Promise<{ product: ActionProduct; kind: ActionKind }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function readParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined
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
