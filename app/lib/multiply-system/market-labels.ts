import { formatTokenDisplaySymbol } from "@/app/lib/token-icons"

function displaySymbol(symbol: string) {
  return formatTokenDisplaySymbol(symbol)
}

/** Short pair label (e.g. "USDC / GHO"). */
export function formatMultiplyLoopPairLabel(collateralSymbol: string, borrowSymbol: string) {
  return `${displaySymbol(collateralSymbol)} / ${displaySymbol(borrowSymbol)}`
}

export const MULTIPLY_LOOP_SUPPLY_VERB = "Supply" as const
export const MULTIPLY_LOOP_BORROW_VERB = "Borrow" as const
export const MULTIPLY_LOOP_SUPPLY_LABEL = "Supply {collateral}" as const
export const MULTIPLY_LOOP_BORROW_LABEL = "Borrow {borrow}" as const

/** Market row label that names collateral and borrow roles explicitly. */
export function formatMultiplyLoopMarketLabel(collateralSymbol: string, borrowSymbol: string) {
  return `${formatMultiplyLoopSupplyLabel(collateralSymbol)} · ${formatMultiplyLoopBorrowLabel(borrowSymbol)}`
}

export function formatMultiplyLoopSupplyLabel(collateralSymbol: string) {
  return `${MULTIPLY_LOOP_SUPPLY_VERB} ${displaySymbol(collateralSymbol)}`
}

export function formatMultiplyLoopBorrowLabel(borrowSymbol: string) {
  return `${MULTIPLY_LOOP_BORROW_VERB} ${displaySymbol(borrowSymbol)}`
}

function translateLoopRoleLabel(
  t: (key: string) => string,
  phraseKey: string,
  verbKey: string,
  placeholder: string,
  symbol: string,
) {
  const phrase = t(phraseKey)
  if (phrase !== phraseKey && phrase.includes(placeholder)) {
    return phrase.replace(placeholder, symbol)
  }
  return `${t(verbKey)} ${symbol}`
}

export function translateMultiplyLoopSupplyLabel(t: (key: string) => string, collateralSymbol: string) {
  return translateLoopRoleLabel(
    t,
    MULTIPLY_LOOP_SUPPLY_LABEL,
    MULTIPLY_LOOP_SUPPLY_VERB,
    "{collateral}",
    displaySymbol(collateralSymbol),
  )
}

export function translateMultiplyLoopBorrowLabel(t: (key: string) => string, borrowSymbol: string) {
  return translateLoopRoleLabel(
    t,
    MULTIPLY_LOOP_BORROW_LABEL,
    MULTIPLY_LOOP_BORROW_VERB,
    "{borrow}",
    displaySymbol(borrowSymbol),
  )
}

export function translateMultiplyLoopMarketLabel(
  t: (key: string) => string,
  collateralSymbol: string,
  borrowSymbol: string,
) {
  return `${translateMultiplyLoopSupplyLabel(t, collateralSymbol)} · ${translateMultiplyLoopBorrowLabel(t, borrowSymbol)}`
}
