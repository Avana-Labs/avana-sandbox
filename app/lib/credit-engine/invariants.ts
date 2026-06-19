import type { BorrowAccountState, BorrowAssetRecord, BorrowMarketRecord, BorrowSystemState } from "./types"

function assertNonNegative(label: string, value: bigint) {
  if (value < 0n) {
    throw new Error(`${label} cannot be negative`)
  }
}

function assertUnique<T extends { id: string }>(rows: T[], label: string) {
  const seen = new Set<string>()
  for (const row of rows) {
    if (seen.has(row.id)) throw new Error(`Duplicate ${label} id: ${row.id}`)
    seen.add(row.id)
  }
}

function assertMarketRecord(market: BorrowMarketRecord) {
  assertNonNegative(`${market.id}.collateralFactorWad`, market.riskConfig.collateralFactorWad)
  assertNonNegative(`${market.id}.liquidationThresholdWad`, market.riskConfig.liquidationThresholdWad)
  assertNonNegative(`${market.id}.riskScoreWad`, market.riskConfig.riskScoreWad)
  assertNonNegative(`${market.id}.lpTokenPriceUsd6`, market.snapshot.lpTokenPriceUsd6)
  assertNonNegative(`${market.id}.feeApyWad`, market.snapshot.feeApyWad)
  assertNonNegative(`${market.id}.totalLiquidityUsd6`, market.snapshot.totalLiquidityUsd6)
  assertNonNegative(`${market.id}.totalBorrowedUsd6`, market.snapshot.totalBorrowedUsd6)
  assertNonNegative(`${market.id}.availableUsd6`, market.snapshot.availableUsd6)
  assertNonNegative(`${market.id}.totalCollateralShares`, market.snapshot.totalCollateralShares)
}

function assertAssetRecord(asset: BorrowAssetRecord) {
  assertNonNegative(`${asset.id}.baseBorrowAprWad`, asset.borrowConfig.baseBorrowAprWad)
  assertNonNegative(`${asset.id}.priceUsd6`, asset.snapshot.priceUsd6)
  assertNonNegative(`${asset.id}.availableLiquidityUsd6`, asset.snapshot.availableLiquidityUsd6)
  assertNonNegative(`${asset.id}.totalBorrowedUsd6`, asset.snapshot.totalBorrowedUsd6)
  assertNonNegative(`${asset.id}.totalDebtSharesUsd6`, asset.snapshot.totalDebtSharesUsd6)
}

function assertAccountState(account: BorrowAccountState, system: BorrowSystemState) {
  assertNonNegative(`${account.walletId}.walletBalanceUsd6`, account.walletBalanceUsd6)
  assertNonNegative(`${account.walletId}.interestSettledUsd6`, account.interestSettledUsd6)

  assertUnique(account.collateralPositions, `${account.walletId} collateral position`)
  assertUnique(account.debtPositions, `${account.walletId} debt position`)

  for (const position of account.collateralPositions) {
    if (!system.markets[position.marketId]) {
      throw new Error(`Unknown market on collateral position ${position.id}: ${position.marketId}`)
    }
    assertNonNegative(`${position.id}.collateralShares`, position.collateralShares)
    assertNonNegative(`${position.id}.principalTokenAmount`, position.principalTokenAmount)
  }

  for (const debt of account.debtPositions) {
    if (!system.assets[debt.assetId]) {
      throw new Error(`Unknown asset on debt position ${debt.id}: ${debt.assetId}`)
    }
    if (debt.marketId && !system.markets[debt.marketId]) {
      throw new Error(`Unknown linked market on debt position ${debt.id}: ${debt.marketId}`)
    }
    assertNonNegative(`${debt.id}.debtSharesUsd6`, debt.debtSharesUsd6)
    assertNonNegative(`${debt.id}.debtIndexRay`, debt.debtIndexRay)
    assertNonNegative(`${debt.id}.borrowRateWad`, debt.borrowRateWad)
    assertNonNegative(`${debt.id}.principalBorrowedUsd6`, debt.principalBorrowedUsd6)
  }
}

export function assertBorrowSystemInvariants(system: BorrowSystemState) {
  assertUnique(Object.values(system.markets), "market")
  assertUnique(Object.values(system.assets), "asset")
  assertUnique(Object.values(system.accounts).map((account) => ({ id: account.walletId })), "account")

  for (const market of Object.values(system.markets)) {
    assertMarketRecord(market)
    for (const assetId of market.relations.supportedBorrowAssetIds) {
      if (!system.assets[assetId]) {
        throw new Error(`Market ${market.id} references unknown asset ${assetId}`)
      }
    }
    for (const relatedMarketId of market.relations.relatedMarketIds) {
      if (!system.markets[relatedMarketId]) {
        throw new Error(`Market ${market.id} references unknown related market ${relatedMarketId}`)
      }
    }
  }

  for (const asset of Object.values(system.assets)) {
    assertAssetRecord(asset)
  }

  for (const account of Object.values(system.accounts)) {
    assertAccountState(account, system)
  }

  for (const transaction of system.transactions) {
    if (!system.accounts[transaction.walletId]) {
      throw new Error(`Transaction ${transaction.id} references unknown wallet ${transaction.walletId}`)
    }
    assertNonNegative(`${transaction.id}.amountUsd6`, transaction.amountUsd6)
    if (transaction.marketId && !system.markets[transaction.marketId]) {
      throw new Error(`Transaction ${transaction.id} references unknown market ${transaction.marketId}`)
    }
    if (transaction.assetId && !system.assets[transaction.assetId]) {
      throw new Error(`Transaction ${transaction.id} references unknown asset ${transaction.assetId}`)
    }
  }
}
