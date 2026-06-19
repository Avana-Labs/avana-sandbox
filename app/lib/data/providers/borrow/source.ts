import { buildBorrowSnapshot } from "@/app/lib/borrow-data"
import { serializeBorrowSystemState } from "@/app/lib/borrow-system/codec"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import {
  selectBorrowableAssets,
  selectBorrowCollateralPools,
  selectBorrowMarketSummaries,
  selectInitialBorrowDebts,
  selectWalletBorrowSnapshot,
} from "@/app/lib/borrow-system/selectors"
import {
  createDataSourceAdapter,
  createUnsupportedSourceError,
  type DataSourceAdapter,
  type DataSourceRequestContext,
  type DataSourceResponse,
} from "@/app/lib/data/core/source-runtime"
import {
  BORROW_DEXES,
  BORROW_PENDING_ROWS,
} from "@/app/lib/data/mock/shared/borrow"
import { getDefaultWalletProfileId } from "@/app/lib/data/mock/wallet/portfolio/profiles"
import type { BorrowPageData } from "./types"

export type BorrowPageSource = {
  adapter: DataSourceAdapter
  getBorrowPageData(context?: DataSourceRequestContext): Promise<DataSourceResponse<BorrowPageData>>
}

export const mockBorrowPageAdapter = createDataSourceAdapter({
  id: "borrow-mock",
  label: "Borrow page mock source",
  mode: "mock",
})

export const liveBorrowPageAdapter = createDataSourceAdapter({
  id: "borrow-live",
  label: "Borrow page live source",
  mode: "live",
})

export const mockBorrowPageSource: BorrowPageSource = {
  adapter: mockBorrowPageAdapter,
  async getBorrowPageData() {
    const snapshot = buildBorrowSnapshot()
    const walletId = getDefaultWalletProfileId()
    const systemState = buildMockBorrowSystemState(walletId)

    return {
      fetchedAt: new Date().toISOString(),
      data: {
        ...snapshot,
        walletId,
        borrowSessionSeed: serializeBorrowSystemState(systemState),
        poolCatalog: selectBorrowMarketSummaries(systemState, walletId),
        borrowableAssets: selectBorrowableAssets(systemState, walletId),
        pendingRows: BORROW_PENDING_ROWS,
        dexes: BORROW_DEXES,
        collateralPools: selectBorrowCollateralPools(systemState, walletId),
        initialDebts: selectInitialBorrowDebts(systemState, walletId),
        borrowSnapshot: selectWalletBorrowSnapshot(systemState, walletId),
      },
    }
  },
}

export const liveBorrowPageSource: BorrowPageSource = {
  adapter: liveBorrowPageAdapter,
  async getBorrowPageData() {
    throw createUnsupportedSourceError(liveBorrowPageAdapter, "getBorrowPageData")
  },
}
