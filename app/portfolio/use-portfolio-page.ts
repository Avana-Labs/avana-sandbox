"use client"

import * as React from "react"
import { fetchPortfolioPage, type FetchPortfolioPageInput, type PortfolioPageData } from "@/app/lib/data/providers/portfolio"

type State = {
  data: PortfolioPageData | null
  error: string | null
  isLoading: boolean
}

type UsePortfolioPageResult = State & {
  retry: () => void
}

export function usePortfolioPage(input: FetchPortfolioPageInput, initialData?: PortfolioPageData | null): UsePortfolioPageResult {
  const [state, setState] = React.useState<State>({
    data: initialData ?? null,
    error: null,
    isLoading: initialData ? false : true,
  })
  const [retryNonce, setRetryNonce] = React.useState(0)
  const requestInput = React.useMemo(() => ({ ...input }), [input.walletProfileId])

  const retry = React.useCallback(() => {
    setRetryNonce((current) => current + 1)
  }, [])

  React.useEffect(() => {
    if (initialData?.walletProfile.id === input.walletProfileId) {
      setState({
        data: initialData,
        error: null,
        isLoading: false,
      })
      return
    }

    const controller = new AbortController()

    setState((current) => ({
      data: current.data,
      error: null,
      isLoading: current.data ? false : true,
    }))

    fetchPortfolioPage(requestInput, { signal: controller.signal })
      .then((data) => {
        setState({
          data,
          error: null,
          isLoading: false,
        })
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return

        setState({
          data: null,
          error: error instanceof Error ? error.message : "Unable to load portfolio.",
          isLoading: false,
        })
      })

    return () => controller.abort()
  }, [initialData, input.walletProfileId, requestInput, retryNonce])

  return {
    ...state,
    retry,
  }
}
