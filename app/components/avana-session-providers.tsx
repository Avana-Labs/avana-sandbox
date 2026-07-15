"use client";

import { lazy, Suspense, type ReactNode } from "react";
import { AvanaSessionsProvider } from "@/app/lib/avana-session/avana-sessions-provider";
import {
  hasConvexClient,
  MarketLiquidityProvider,
} from "@/app/lib/convex/market-liquidity-provider";
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth";
import {
  shouldUseOpenGateSession,
  TEST_MODE_WALLET_ADDRESS,
} from "@/app/lib/test-mode";

const ConvexSessionProvider = lazy(
  async () => ({
    default: (await import("@/app/lib/avana-session/convex-session-provider")).ConvexSessionProvider,
  }),
);

export function AvanaSessionProviders({
  walletId,
  children,
}: {
  walletId?: string;
  children: ReactNode;
}) {
  const { authedWallet, isSignedIn } = useSiweAuth();
  if (shouldUseOpenGateSession()) {
    return (
      <MarketLiquidityProvider live={false}>
        <AvanaSessionsProvider walletId={TEST_MODE_WALLET_ADDRESS}>
          {children}
        </AvanaSessionsProvider>
      </MarketLiquidityProvider>
    );
  }
  // A signed-in SIWE wallet drives the entire session (positions, seeds, Convex reads);
  // otherwise keep the explicit / default (demo) wallet so the public demo is unchanged.
  // No auto-prompt: the user signs the SIWE message once via the explicit "Sign in"
  // control (ConnectKit's flow), so the signature is never requested repeatedly.
  const effectiveWalletId =
    isSignedIn && authedWallet ? authedWallet : walletId;
  return (
    <MarketLiquidityProvider
      live={Boolean(hasConvexClient && isSignedIn && authedWallet)}
    >
      {hasConvexClient && isSignedIn && authedWallet ? (
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <ConvexSessionProvider walletId={authedWallet}>
            {children}
          </ConvexSessionProvider>
        </Suspense>
      ) : (
        <AvanaSessionsProvider walletId={effectiveWalletId}>
          {children}
        </AvanaSessionsProvider>
      )}
    </MarketLiquidityProvider>
  );
}
