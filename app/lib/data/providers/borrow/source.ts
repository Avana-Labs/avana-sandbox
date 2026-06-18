import { buildBorrowSnapshot } from "@/app/lib/borrow-data"
import {
  BORROW_DEXES,
  BORROW_PENDING_ROWS,
  BORROW_POOL_CATALOG,
  HOME_COLLATERAL_POOLS,
  HOME_INITIAL_DEBTS,
} from "@/app/lib/data/mock/shared/borrow"
import type { BorrowPageData } from "./types"

export type BorrowPageSource = {
  getBorrowPageData(): Promise<BorrowPageData>
}

export const mockBorrowPageSource: BorrowPageSource = {
  async getBorrowPageData() {
    const snapshot = buildBorrowSnapshot()

    return {
      ...snapshot,
      poolCatalog: BORROW_POOL_CATALOG,
      pendingRows: BORROW_PENDING_ROWS,
      dexes: BORROW_DEXES,
      collateralPools: HOME_COLLATERAL_POOLS,
      initialDebts: HOME_INITIAL_DEBTS,
    }
  },
}
