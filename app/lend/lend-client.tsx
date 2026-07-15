"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { LendPageData } from "@/app/lib/data/providers/lend";
import { actionPagePath } from "@/app/lib/action-system/contracts";
import { useLendSessionContext } from "@/app/lib/lend-system/lend-session-context";
import { TokenPricesProvider } from "@/app/lib/prices/token-prices-context";
import { LendHero } from "./components/lend-hero";
import { useLendPageLive } from "./use-lend-page-live";
import { HotMarkets } from "./components/hot-markets";
import { LendAssetSpokes } from "./components/lend-asset-spokes";

export function LendClient({
  pageData,
  initialIsDesktop = true,
}: {
  pageData: LendPageData;
  initialIsDesktop?: boolean;
}) {
  const router = useRouter();
  const lendSession = useLendSessionContext();
  const livePageData = useLendPageLive(lendSession.walletId, lendSession);
  const resolvedPageData = useMemo(
    () => livePageData ?? pageData,
    [livePageData, pageData],
  );
  const {
    markets,
    featuredAssets,
    featuredSequence,
    featuredSnapshots,
    assetGroups,
  } = resolvedPageData;

  return (
    <TokenPricesProvider>
      <div className="bg-background">
        <main className="py-8">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-[1152px]">
              <LendHero markets={markets} />

              <div className="mt-7">
                <HotMarkets
                  assets={featuredAssets}
                  sequence={featuredSequence}
                  snapshots={featuredSnapshots}
                />
              </div>

              <LendAssetSpokes
                groups={assetGroups}
                initialIsDesktop={initialIsDesktop}
                onDeposit={(marketId) =>
                  router.push(
                    actionPagePath("lend", "deposit", { market: marketId }),
                  )
                }
              />
            </div>
          </div>
        </main>
      </div>
    </TokenPricesProvider>
  );
}
