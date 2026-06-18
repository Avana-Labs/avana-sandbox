import { mockPortfolioPageSource } from "@/app/lib/data/mock/wallet/portfolio/source"
import { resolveDataSourceMode, unsupportedLiveSource } from "../source-mode"
import { mapPortfolioPage } from "./map-portfolio-page"
import type { PortfolioPageSource } from "./source"
import type { FetchPortfolioPageInput, PortfolioPageData } from "./types"

function getPortfolioPageSource(source?: PortfolioPageSource) {
  if (source) return source
  const mode = resolveDataSourceMode()
  if (mode === "mock") return mockPortfolioPageSource
  return unsupportedLiveSource("portfolio page")
}

export async function fetchPortfolioPage(
  input: FetchPortfolioPageInput,
  options?: { signal?: AbortSignal; source?: PortfolioPageSource },
): Promise<PortfolioPageData> {
  if (options?.signal?.aborted) {
    throw new DOMException("Request aborted", "AbortError")
  }

  const records = await getPortfolioPageSource(options?.source).getPortfolioPageRecords(input.walletProfileId)
  return mapPortfolioPage(records)
}

export function resolvePortfolioWalletProfileId() {
  return getPortfolioPageSource().getDefaultWalletProfileId()
}

export type { FetchPortfolioPageInput, PortfolioPageData, PortfolioTabKey } from "./types"
