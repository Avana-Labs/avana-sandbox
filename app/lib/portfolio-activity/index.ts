import { getMockPortfolioActivity } from "./mock"
import type { PortfolioActivityQuery, PortfolioActivityResponse } from "./types"

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

/**
 * @swap-to-api Replace with `GET /portfolio/{walletAddress}/activity`.
 * Keep this signature stable so the UI keeps using the same wallet-scoped query contract.
 */
export async function fetchPortfolioActivity(
  query: PortfolioActivityQuery,
  options?: { signal?: AbortSignal },
): Promise<PortfolioActivityResponse> {
  await wait(180, options?.signal)
  return getMockPortfolioActivity(query)
}

export type {
  PortfolioActivityKind,
  PortfolioActivityProduct,
  PortfolioActivityQuery,
  PortfolioActivityResponse,
  PortfolioActivityRow,
  PortfolioActivityStatus,
} from "./types"
