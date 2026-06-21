import { ActionPageClient } from "@/app/components/action-page/action-page-client"
import type { ActionKind, ActionProduct } from "@/app/lib/action-system/contracts"

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
      mode="page"
      closeHref={
        product === "borrow"
          ? "/borrow"
          : product === "lend"
            ? "/lend"
            : product === "multiply"
              ? "/multiply"
              : "/rewards"
      }
      initialAssetId={readParam(query.asset)}
      initialMarketId={readParam(query.market)}
      initialAmount={readParam(query.amount)}
      initialMultiplier={readParam(query.multiplier)}
    />
  )
}
