import type { BorrowAction, BorrowSystemState } from "@/app/lib/credit-engine"
import { RAY, USD_SCALE, WAD, parseFixed } from "@/app/lib/credit-engine"
import { makeExampleBorrowSystemState } from "./fixtures"

function usdFromInt(value: number) {
  return BigInt(value) * USD_SCALE
}

function tokenFromInt(value: number) {
  return BigInt(value) * WAD
}

export function makeStressBorrowSystemState(userCount = 1000): BorrowSystemState {
  const state = makeExampleBorrowSystemState()
  const marketIds = Object.keys(state.markets) as Array<keyof typeof state.markets>
  const accounts: BorrowSystemState["accounts"] = {}

  for (let index = 0; index < userCount; index += 1) {
    const walletId = `wallet-stress-${index}`
    const marketId = marketIds[index % marketIds.length]!
    const market = state.markets[marketId]!
    const assetId = market.relations.supportedBorrowAssetIds[index % market.relations.supportedBorrowAssetIds.length]!
    const asset = state.assets[assetId]!
    const collateralTokens = 5 + (index % 8)
    const baseDebtUsd = 600 + (index % 7) * 125

    accounts[walletId] = {
      walletId,
      walletBalanceUsd6: usdFromInt(2500 + (index % 10) * 150),
      interestSettledUsd6: 0n,
      lastUpdatedAt: state.now - 60_000,
      collateralPositions: [
        {
          id: `${walletId}:${marketId}`,
          marketId,
          collateralShares: tokenFromInt(collateralTokens),
          principalTokenAmount: tokenFromInt(collateralTokens),
          collateralEnabled: true,
        },
      ],
      debtPositions: [
        {
          id: `${walletId}:${assetId}`,
          assetId,
          baseAssetId: asset.baseAssetId,
          spokeId: asset.spokeId,
          marketId,
          debtSharesUsd6: usdFromInt(baseDebtUsd),
          debtIndexRay: RAY,
          borrowRateWad: asset.borrowConfig.baseBorrowAprWad,
          principalBorrowedUsd6: usdFromInt(baseDebtUsd),
        },
      ],
    }
  }

  return {
    ...state,
    accounts,
    transactions: [],
  }
}

export function makeStressBorrowActions(state: BorrowSystemState): BorrowAction[] {
  const actions: BorrowAction[] = []
  const walletIds = Object.keys(state.accounts)

  for (let index = 0; index < walletIds.length; index += 1) {
    const walletId = walletIds[index]!
    const account = state.accounts[walletId]!
    const collateral = account.collateralPositions[0]!
    const debt = account.debtPositions[0]!
    const market = state.markets[collateral.marketId]!
    const assetId = market.relations.supportedBorrowAssetIds[0]!
    const baseAt = state.now + index * 1000

    actions.push({
      type: "supplyCollateral",
      walletId,
      marketId: collateral.marketId,
      amountUsd6: parseFixed(`${150 + (index % 5) * 25}`, 6),
      at: baseAt,
    })

    actions.push({
      type: "borrow",
      walletId,
      marketId: collateral.marketId,
      assetId,
      amountUsd6: parseFixed(`${40 + (index % 4) * 10}`, 6),
      at: baseAt + 1,
    })

    if (index % 3 === 0) {
      actions.push({
        type: "repay",
        walletId,
        debtPositionId: debt.id,
        amountUsd6: parseFixed("20", 6),
        at: baseAt + 2,
      })
    }

    if (index % 5 === 0) {
      actions.push({
        type: "removeCollateral",
        walletId,
        positionId: collateral.id,
        percentBps: 200,
        at: baseAt + 3,
      })
    }
  }

  return actions
}
