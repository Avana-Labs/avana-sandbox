import {
  HOME_BORROW_TOKENS,
  HOME_CLAIM_POSITIONS,
  HOME_COLLATERAL_POOLS,
  HOME_DEFAULT_SELECTIONS,
  HOME_INITIAL_CLAIMABLE_TOTALS,
  HOME_INITIAL_CLAIM_SELECTIONS,
  HOME_INITIAL_DEBTS,
  HOME_PORTFOLIO_SUMMARY,
  formatCompactUsd,
  formatHealthFactor,
  formatUsd,
  getBorrowTokenById,
  getClaimPositionById,
  getPoolById,
} from "@/app/lib/home-sim"
import {
  BORROWABLE_ASSETS,
  BORROWABLE_CATEGORIES,
  BORROW_DEXES,
  BORROW_PENDING_ROWS,
  BORROW_POOL_CATALOG,
  type BorrowPoolRow,
} from "@/app/lib/borrow-sim"

export {
  BORROWABLE_ASSETS,
  BORROWABLE_CATEGORIES,
  BORROW_DEXES,
  BORROW_PENDING_ROWS,
  BORROW_POOL_CATALOG,
  type BorrowPoolRow,
  HOME_BORROW_TOKENS,
  HOME_CLAIM_POSITIONS,
  HOME_COLLATERAL_POOLS,
  HOME_DEFAULT_SELECTIONS,
  HOME_INITIAL_CLAIMABLE_TOTALS,
  HOME_INITIAL_CLAIM_SELECTIONS,
  HOME_INITIAL_DEBTS,
  HOME_PORTFOLIO_SUMMARY,
  formatCompactUsd,
  formatHealthFactor,
  formatUsd,
  getBorrowTokenById,
  getClaimPositionById,
  getPoolById,
}

export const mockBorrowSharedSource = {
  getPortfolioSummary() {
    return HOME_PORTFOLIO_SUMMARY
  },
  getCollateralPools() {
    return HOME_COLLATERAL_POOLS
  },
  getBorrowTokens() {
    return HOME_BORROW_TOKENS
  },
  getClaimPositions() {
    return HOME_CLAIM_POSITIONS
  },
  getInitialState() {
    return {
      debts: HOME_INITIAL_DEBTS,
      claimSelections: HOME_INITIAL_CLAIM_SELECTIONS,
      claimableTotals: HOME_INITIAL_CLAIMABLE_TOTALS,
      selections: HOME_DEFAULT_SELECTIONS,
    }
  },
  getDexes() {
    return BORROW_DEXES
  },
  getPoolCatalog() {
    return BORROW_POOL_CATALOG
  },
  getBorrowableAssets() {
    return BORROWABLE_ASSETS
  },
  getBorrowableCategories() {
    return BORROWABLE_CATEGORIES
  },
  getPendingRows() {
    return BORROW_PENDING_ROWS
  },
}
