import type { BorrowPool, BorrowProtocolMap } from "@/app/lib/borrow-data"
import {
  BORROW_DEXES,
  BORROW_PENDING_ROWS,
  BORROW_POOL_CATALOG,
  HOME_COLLATERAL_POOLS,
  HOME_INITIAL_DEBTS,
} from "@/app/lib/data/mock/shared/borrow"

export type BorrowPageData = {
  protocols: BorrowProtocolMap
  allPools: BorrowPool[]
  protocolLogos: Record<string, string>
  itemsPerPage: number
  poolCatalog: ReadonlyArray<(typeof BORROW_POOL_CATALOG)[number]>
  pendingRows: ReadonlyArray<(typeof BORROW_PENDING_ROWS)[number]>
  dexes: ReadonlyArray<(typeof BORROW_DEXES)[number]>
  collateralPools: ReadonlyArray<(typeof HOME_COLLATERAL_POOLS)[number]>
  initialDebts: typeof HOME_INITIAL_DEBTS
}
