"use client"

import * as React from "react"
import { fetchPortfolioPage, type FetchPortfolioPageInput, type PortfolioPageData } from "@/app/lib/data/providers/portfolio"

type State = {
  data: PortfolioPageData | null
  error: string | null
  isLoading: boolean
}

export function usePortfolioPage(input: FetchPortfolioPageInput, initialData?: PortfolioPageData | null) {
  const [state, setState] = React.useState<State>({
    data: initialData ?? null,
    error: null,
    isLoading: initialData ? false : true,
  })

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

    fetchPortfolioPage(input, { signal: controller.signal })
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
  }, [input.walletProfileId])

  return state
}
