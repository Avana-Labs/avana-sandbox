import type { BorrowSystemState } from "@/app/lib/credit-engine"
import { RAY, parseFixed } from "@/app/lib/credit-engine"

export function makeExampleBorrowSystemState(): BorrowSystemState {
  return {
    now: Date.UTC(2026, 5, 19),
    markets: {
      "uni-v3-bluechip-weth-usdc": {
        id: "uni-v3-bluechip-weth-usdc",
        spokeId: "uni-v3-bluechip",
        display: {
          name: "WETH / USDC",
          lpSymbol: "UNI-V3 WETH/USDC",
          venue: "Uniswap v3",
          chain: "Ethereum",
          feeTier: "0.30%",
          subtitle: "Bluechip LP collateral",
          visuals: [
            {
              symbol: "WETH",
              shortLabel: "W",
              bgClassName: "bg-slate-800",
              textClassName: "text-slate-100",
            },
            {
              symbol: "USDC",
              shortLabel: "U",
              bgClassName: "bg-sky-500",
              textClassName: "text-sky-50",
            },
          ],
        },
        riskConfig: {
          collateralFactorWad: parseFixed("0.72", 18),
          liquidationThresholdWad: parseFixed("0.82", 18),
          riskScoreWad: parseFixed("0.22", 18),
        },
        relations: {
          supportedBorrowAssetIds: ["usdc", "usdt", "weth"],
          relatedMarketIds: ["curve-eth-usdt"],
        },
        snapshot: {
          lpTokenPriceUsd6: parseFixed("1845.22", 6),
          feeApyWad: parseFixed("0.18", 18),
          totalLiquidityUsd6: parseFixed("312400000", 6),
          totalBorrowedUsd6: parseFixed("48900000", 6),
          availableUsd6: parseFixed("98200000", 6),
          volume24hUsd6: parseFixed("48900000", 6),
          fees24hUsd6: parseFixed("146700", 6),
          totalCollateralShares: parseFixed("95000", 18),
          supplyIndexRay: RAY,
        },
        detail: {
          about: "WETH / USDC LP accepted as collateral.",
          faqs: [{ question: "What is this market?", answer: "A bluechip LP market." }],
          parameterChanges: [{ date: "2026-06-01", title: "Raised collateral factor" }],
          governanceNotes: [{ title: "Risk council", body: "Reviewed quarterly.", tone: "info" }],
        },
        analytics: {
          keyMetrics: {},
          cashflow: { label: "Cashflow", unit: "usd", points: [] },
          engagement: { label: "Engagement", unit: "count", points: [] },
        },
      },
      "curve-eth-usdt": {
        id: "curve-eth-usdt",
        spokeId: "curve-crypto",
        display: {
          name: "ETH / USDT",
          lpSymbol: "CURVE ETH/USDT",
          venue: "Curve",
          chain: "Ethereum",
          feeTier: "0.04%",
          subtitle: "Curve LP collateral",
          visuals: [
            {
              symbol: "ETH",
              shortLabel: "E",
              bgClassName: "bg-violet-500",
              textClassName: "text-violet-50",
            },
            {
              symbol: "USDT",
              shortLabel: "T",
              bgClassName: "bg-emerald-500",
              textClassName: "text-emerald-50",
            },
          ],
        },
        riskConfig: {
          collateralFactorWad: parseFixed("0.68", 18),
          liquidationThresholdWad: parseFixed("0.78", 18),
          riskScoreWad: parseFixed("0.31", 18),
        },
        relations: {
          supportedBorrowAssetIds: ["usdc", "usdt"],
          relatedMarketIds: ["uni-v3-bluechip-weth-usdc"],
        },
        snapshot: {
          lpTokenPriceUsd6: parseFixed("1522.4", 6),
          feeApyWad: parseFixed("0.14", 18),
          totalLiquidityUsd6: parseFixed("188000000", 6),
          totalBorrowedUsd6: parseFixed("24000000", 6),
          availableUsd6: parseFixed("72000000", 6),
          volume24hUsd6: parseFixed("12500000", 6),
          fees24hUsd6: parseFixed("84500", 6),
          totalCollateralShares: parseFixed("61000", 18),
          supplyIndexRay: RAY,
        },
        detail: {
          about: "Curve ETH / USDT collateral market.",
          faqs: [{ question: "What is Curve?", answer: "A DEX focused on efficient swaps." }],
          parameterChanges: [{ date: "2026-05-10", title: "Oracle window tightened" }],
          governanceNotes: [{ title: "Oracle", body: "TWAP reduced.", tone: "warning" }],
        },
        analytics: {
          keyMetrics: {},
          cashflow: { label: "Cashflow", unit: "usd", points: [] },
          engagement: { label: "Engagement", unit: "count", points: [] },
        },
      },
    },
    assets: {
      usdc: {
        id: "usdc",
        symbol: "USDC",
        display: {
          name: "USD Coin",
          subtitle: "Primary stable borrow asset",
          chain: "Ethereum",
          category: "stable",
          visual: {
            symbol: "USDC",
            shortLabel: "U",
            bgClassName: "bg-sky-500",
            textClassName: "text-sky-50",
          },
        },
        borrowConfig: {
          baseBorrowAprWad: parseFixed("0.052", 18),
        },
        snapshot: {
          priceUsd6: parseFixed("1", 6),
          priceChange24hWad: parseFixed("0.0002", 18),
          availableLiquidityUsd6: parseFixed("125000000", 6),
          totalBorrowedUsd6: parseFixed("54000000", 6),
          totalDebtSharesUsd6: parseFixed("54000000", 6),
        },
        detail: {
          about: "USDC borrow market.",
          faqs: [{ question: "What is USDC?", answer: "A dollar-backed stablecoin." }],
        },
        analytics: {
          utilization: { label: "Utilization", unit: "pct", points: [] },
          supplyBorrow: {},
        },
      },
      usdt: {
        id: "usdt",
        symbol: "USDT",
        display: {
          name: "Tether",
          subtitle: "Secondary stable borrow asset",
          chain: "Ethereum",
          category: "stable",
          visual: {
            symbol: "USDT",
            shortLabel: "T",
            bgClassName: "bg-emerald-500",
            textClassName: "text-emerald-50",
          },
        },
        borrowConfig: {
          baseBorrowAprWad: parseFixed("0.057", 18),
        },
        snapshot: {
          priceUsd6: parseFixed("1", 6),
          priceChange24hWad: parseFixed("0.0001", 18),
          availableLiquidityUsd6: parseFixed("98000000", 6),
          totalBorrowedUsd6: parseFixed("31000000", 6),
          totalDebtSharesUsd6: parseFixed("31000000", 6),
        },
        detail: {
          about: "USDT borrow market.",
          faqs: [{ question: "What is USDT?", answer: "A dollar-backed stablecoin." }],
        },
        analytics: {
          utilization: { label: "Utilization", unit: "pct", points: [] },
          supplyBorrow: {},
        },
      },
      weth: {
        id: "weth",
        symbol: "WETH",
        display: {
          name: "Wrapped Ether",
          subtitle: "Volatile borrow asset",
          chain: "Ethereum",
          category: "eth",
          visual: {
            symbol: "WETH",
            shortLabel: "W",
            bgClassName: "bg-slate-800",
            textClassName: "text-slate-100",
          },
        },
        borrowConfig: {
          baseBorrowAprWad: parseFixed("0.061", 18),
        },
        snapshot: {
          priceUsd6: parseFixed("3472.18", 6),
          priceChange24hWad: parseFixed("-0.0214", 18),
          availableLiquidityUsd6: parseFixed("84000000", 6),
          totalBorrowedUsd6: parseFixed("28000000", 6),
          totalDebtSharesUsd6: parseFixed("28000000", 6),
        },
        detail: {
          about: "WETH borrow market.",
          faqs: [{ question: "What is WETH?", answer: "Wrapped ETH." }],
        },
        analytics: {
          utilization: { label: "Utilization", unit: "pct", points: [] },
          supplyBorrow: {},
        },
      },
    },
    accounts: {
      "wallet-1": {
        walletId: "wallet-1",
        walletBalanceUsd6: parseFixed("12500", 6),
        interestSettledUsd6: 0n,
        lastUpdatedAt: Date.UTC(2026, 5, 18, 12),
        collateralPositions: [
          {
            id: "wallet-1:weth-usdc",
            marketId: "uni-v3-bluechip-weth-usdc",
            collateralShares: parseFixed("8.25", 18),
            principalTokenAmount: parseFixed("8.25", 18),
            collateralEnabled: true,
          },
          {
            id: "wallet-1:curve-eth-usdt",
            marketId: "curve-eth-usdt",
            collateralShares: parseFixed("3.4", 18),
            principalTokenAmount: parseFixed("3.4", 18),
            collateralEnabled: true,
          },
        ],
        debtPositions: [
          {
            id: "wallet-1:usdc",
            assetId: "usdc",
            marketId: "uni-v3-bluechip-weth-usdc",
            debtSharesUsd6: parseFixed("6200", 6),
            debtIndexRay: RAY,
            borrowRateWad: parseFixed("0.052", 18),
            principalBorrowedUsd6: parseFixed("6200", 6),
          },
        ],
      },
      "wallet-2": {
        walletId: "wallet-2",
        walletBalanceUsd6: parseFixed("8200", 6),
        interestSettledUsd6: 0n,
        lastUpdatedAt: Date.UTC(2026, 5, 18, 18),
        collateralPositions: [],
        debtPositions: [],
      },
    },
    transactions: [],
  }
}
