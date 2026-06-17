import { assemblePortfolioPage } from "@/app/lib/data/mock/wallet/portfolio/assemble-portfolio-page"
import type { FetchPortfolioPageInput, PortfolioPageData } from "./types"

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(resolve, ms)

    const abort = () => {
      clearTimeout(timeout)
      reject(new DOMException("Request aborted", "AbortError"))
    }

    if (signal?.aborted) {
      abort()
      return
    }

    signal?.addEventListener("abort", abort, { once: true })
  })
}

export async function fetchPortfolioPage(
  input: FetchPortfolioPageInput,
  options?: { signal?: AbortSignal },
): Promise<PortfolioPageData> {
  await wait(180, options?.signal)
  return assemblePortfolioPage(input.walletProfileId)
}

export type { FetchPortfolioPageInput, PortfolioPageData, PortfolioTabKey } from "./types"
