"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { useConvexAuth } from "convex/react"
import { ConvexAvanaSessionsProvider } from "./convex-avana-sessions-provider"
import { AvanaSessionsProvider } from "./avana-sessions-provider"

class ConvexSessionErrorBoundary extends Component<{ walletId: string; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Convex session failed; falling back to local Avana session.", error, info.componentStack)
    }
  }

  render() {
    if (this.state.hasError) {
      return <AvanaSessionsProvider walletId={this.props.walletId}>{this.props.children}</AvanaSessionsProvider>
    }
    return this.props.children
  }
}

export function ConvexSessionProvider({ walletId, children }: { walletId: string; children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth()

  if (!isAuthenticated) return null

  return (
    <ConvexSessionErrorBoundary walletId={walletId}>
      <ConvexAvanaSessionsProvider walletId={walletId}>{children}</ConvexAvanaSessionsProvider>
    </ConvexSessionErrorBoundary>
  )
}
