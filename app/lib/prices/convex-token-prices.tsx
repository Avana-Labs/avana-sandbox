"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { priceKey } from "./format";
import { PriceStatusContext, TokenPricesContext } from "./token-prices-context";

class TokenPricesErrorBoundary extends React.Component<
  { children: React.ReactNode; fallbackChildren: React.ReactNode },
  { errored: boolean }
> {
  state = { errored: false };
  static getDerivedStateFromError() {
    return { errored: true };
  }
  render() {
    if (this.state.errored) return this.props.fallbackChildren;
    return this.props.children;
  }
}

function ConvexTokenPricesQuery({ children }: { children: React.ReactNode }) {
  const snapshot = useQuery(api.prices.getPriceSnapshot, {});
  const rows = snapshot?.prices;
  const status = snapshot?.status;
  const map = React.useMemo(() => {
    const next: Record<string, number> = {};
    for (const row of rows ?? []) next[priceKey(row.symbol)] = row.priceUsd;
    return next;
  }, [rows]);
  return (
    <TokenPricesContext.Provider value={map}>
      <PriceStatusContext.Provider value={status}>
        {children}
      </PriceStatusContext.Provider>
    </TokenPricesContext.Provider>
  );
}

export default function ConvexTokenPrices({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TokenPricesErrorBoundary fallbackChildren={children}>
      <ConvexTokenPricesQuery>{children}</ConvexTokenPricesQuery>
    </TokenPricesErrorBoundary>
  );
}
