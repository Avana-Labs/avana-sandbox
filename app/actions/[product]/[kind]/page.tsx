import { ActionPageClient } from "@/app/components/action-page/action-page-client"
import type { ActionKind, ActionProduct } from "@/app/lib/action-system/contracts"
import { resolveActionCloseHref } from "@/app/lib/action-system/contracts"

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
