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
  poolCatalog: typeof BORROW_POOL_CATALOG
  pendingRows: typeof BORROW_PENDING_ROWS
  dexes: typeof BORROW_DEXES
  collateralPools: typeof HOME_COLLATERAL_POOLS
  initialDebts: typeof HOME_INITIAL_DEBTS
}
