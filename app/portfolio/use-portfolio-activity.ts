"use client"

import * as React from "react"
import { fetchPortfolioActivity, type PortfolioActivityQuery, type PortfolioActivityResponse } from "@/app/lib/portfolio-activity"

type State = {
  data: PortfolioActivityResponse | null
  error: string | null
  isLoading: boolean
}

export function usePortfolioActivity(query: PortfolioActivityQuery) {
  const [state, setState] = React.useState<State>({
    data: null,
    error: null,
    isLoading: true,
  })

  React.useEffect(() => {
    const controller = new AbortController()

    setState((current) => ({
      data: current.data,
      error: null,
      isLoading: true,
    }))

    fetchPortfolioActivity(query, { signal: controller.signal })
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
          error: error instanceof Error ? error.message : "Unable to load activity.",
          isLoading: false,
        })
      })

    return () => controller.abort()
  }, [
    query.walletAddress,
    query.limit,
    query.cursor,
    JSON.stringify(query.products ?? []),
    JSON.stringify(query.kinds ?? []),
    JSON.stringify(query.statuses ?? []),
  ])

  return state
}
