import {
  executeSourceLoad,
  normalizeDataSourceError,
  type DataSourceRequestContext,
} from "@/app/lib/data/core/source-runtime"
import { mockPortfolioPageSource } from "@/app/lib/data/mock/wallet/portfolio/source"
import { resolveDataSourceMode } from "../source-mode"
import { mapPortfolioPage } from "./map-portfolio-page"
import { livePortfolioPageSource, type PortfolioPageSource } from "./source"
import type { FetchPortfolioPageInput, PortfolioPageData } from "./types"

function getPortfolioPageSource(source?: PortfolioPageSource) {
  if (source) return source
  const mode = resolveDataSourceMode()
  return mode === "mock" ? mockPortfolioPageSource : livePortfolioPageSource
}

function getPortfolioPageFallback(source?: PortfolioPageSource) {
  if (source || resolveDataSourceMode() === "mock") return undefined
  // Live mode is strict: authenticated pages must surface missing/unavailable
  // Convex data instead of silently rendering another wallet's mock portfolio.
  return undefined
}

export async function fetchPortfolioPage(
  input: FetchPortfolioPageInput,
  options?: { signal?: AbortSignal; source?: PortfolioPageSource; cursor?: DataSourceRequestContext["cursor"]; limit?: number },
): Promise<PortfolioPageData> {
  const response = await executeSourceLoad({
    primary: getPortfolioPageSource(options?.source),
    fallback: getPortfolioPageFallback(options?.source),
    operation: "getPortfolioPageRecords",
    context: {
      signal: options?.signal,
      cursor: options?.cursor,
      limit: options?.limit,
    },
    load: (pageSource, requestContext) => pageSource.getPortfolioPageRecords(input.walletProfileId, requestContext),
  })

  const pageData = mapPortfolioPage(response.data)

  return {
    ...pageData,
    fetchedAt: response.fetchedAt ?? pageData.fetchedAt,
    activity: {
      ...pageData.activity,
      pageInfo: response.pageInfo,
    },
  }
}

export function resolvePortfolioWalletProfileId(source?: PortfolioPageSource) {
  const primarySource = getPortfolioPageSource(source)

  try {
    return primarySource.getDefaultWalletProfileId()
  } catch (error) {
    throw normalizeDataSourceError(error, primarySource.adapter, "getDefaultWalletProfileId")
  }
}

export type { FetchPortfolioPageInput, PortfolioPageData, PortfolioTabKey } from "./types"
