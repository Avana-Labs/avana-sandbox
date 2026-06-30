import {
  DataSourceError,
  executeSourceLoad,
  normalizeDataSourceError,
  type DataSourceRequestContext,
} from "@/app/lib/data/core/source-runtime"
import { mockPortfolioPageSource } from "@/app/lib/data/mock/wallet/portfolio/source"
import { resolveDataSourceMode } from "../source-mode"
import { mapPortfolioPage } from "./map-portfolio-page"
import { livePortfolioPageSource, type PortfolioPageSource } from "./source"
import type { FetchPortfolioPageInput, PortfolioPageData } from "./types"

type FetchOptions = { signal?: AbortSignal; source?: PortfolioPageSource; cursor?: DataSourceRequestContext["cursor"]; limit?: number }

async function loadFromSource(
  source: PortfolioPageSource,
  input: FetchPortfolioPageInput,
  options?: FetchOptions,
): Promise<PortfolioPageData> {
  const response = await executeSourceLoad({
    primary: source,
    fallback: undefined,
    operation: "getPortfolioPageRecords",
    context: { signal: options?.signal, cursor: options?.cursor, limit: options?.limit },
    load: (pageSource, requestContext) => pageSource.getPortfolioPageRecords(input.walletProfileId, requestContext),
  })
  const pageData = mapPortfolioPage(response.data)
  return {
    ...pageData,
    fetchedAt: response.fetchedAt ?? pageData.fetchedAt,
    activity: { ...pageData.activity, pageInfo: response.pageInfo },
  }
}

export async function fetchPortfolioPage(
  input: FetchPortfolioPageInput,
  options?: FetchOptions,
): Promise<PortfolioPageData> {
  if (options?.source) return loadFromSource(options.source, input, options)
  if (resolveDataSourceMode() === "mock") return loadFromSource(mockPortfolioPageSource, input, options)

  try {
    return await loadFromSource(livePortfolioPageSource, input, options)
  } catch (error) {
    // Unauthenticated visitor (no SIWE token): degrade to the demo portfolio so the
    // dashboard still renders its tabs/positions instead of erroring. An authenticated
    // wallet's genuine load failure still surfaces (only the "auth" code falls back).
    if (error instanceof DataSourceError && error.code === "auth") {
      return loadFromSource(mockPortfolioPageSource, input, options)
    }
    throw error
  }
}

export function resolvePortfolioWalletProfileId(source?: PortfolioPageSource) {
  const primarySource = source ?? (resolveDataSourceMode() === "mock" ? mockPortfolioPageSource : livePortfolioPageSource)
  try {
    return primarySource.getDefaultWalletProfileId()
  } catch (error) {
    if (!source && error instanceof DataSourceError && error.code === "auth") {
      return mockPortfolioPageSource.getDefaultWalletProfileId()
    }
    throw normalizeDataSourceError(error, primarySource.adapter, "getDefaultWalletProfileId")
  }
}

export type { FetchPortfolioPageInput, PortfolioPageData, PortfolioTabKey } from "./types"
