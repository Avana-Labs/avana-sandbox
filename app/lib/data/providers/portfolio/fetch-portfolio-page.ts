import {
  executeSourceLoad,
  normalizeDataSourceError,
  shouldFallbackFromError,
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
  return mockPortfolioPageSource
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
  const fallbackSource = getPortfolioPageFallback(source)

  try {
    return primarySource.getDefaultWalletProfileId()
  } catch (error) {
    const normalizedError = normalizeDataSourceError(error, primarySource.adapter, "getDefaultWalletProfileId")

    if (!fallbackSource || !shouldFallbackFromError(normalizedError)) {
      throw normalizedError
    }

    return fallbackSource.getDefaultWalletProfileId()
  }
}

export type { FetchPortfolioPageInput, PortfolioPageData, PortfolioTabKey } from "./types"
