export type BlockedCta = {
  /** Short, button-sized label describing why the action can't proceed. */
  label: string
  /** When true the CTA stays active and should navigate the user somewhere that
   *  unblocks them (e.g. pledge collateral) instead of sitting disabled. */
  redirect?: boolean
}

/**
 * Map a block reason — raw engine text or a humanized string from
 * `humanizeBlockedReason` — to a short primary-button label (Uniswap-style).
 * The gate lives entirely on the CTA: a disabled button that says why, or an
 * active "redirect" button that moves the user forward. No modal, no banner.
 *
 * `symbol` is the asset the action spends, used for balance messages.
 */
export function blockedCtaLabel(reason: string, options?: { symbol?: string }): BlockedCta {
  const r = reason.toLowerCase()
  const symbol = options?.symbol?.trim()

  // The only redirect case: you can't borrow without collateral, so send the
  // button to the pledge flow instead of dead-ending it.
  if (
    r.includes("no collateral") ||
    (r.includes("deposit") && (r.includes("before") || r.includes("collateral")))
  ) {
    return { label: "Deposit collateral first", redirect: true }
  }

  if (r.includes("borrowing unavailable") || (r.includes("borrow") && r.includes("unavailable"))) {
    return { label: "Borrowing unavailable" }
  }
  if (r.includes("liquidity")) return { label: "Insufficient liquidity" }
  if (/\blp\b/.test(r)) return { label: "Insufficient LP" }
  if (
    r.includes("balance") &&
    (r.includes("insufficient") || r.includes("enough") || r.includes("exceed"))
  ) {
    // Return a translation key with a {symbol} placeholder (interpolated at render)
    // so the label localizes — token tickers themselves are never translated.
    return { label: symbol ? "Insufficient {symbol}" : "Insufficient balance" }
  }
  if (
    r.includes("borrowing power") ||
    r.includes("available credit") ||
    r.includes("safely support") ||
    r.includes("at risk") ||
    r.includes("liquidation") ||
    r.includes("insolvent")
  ) {
    return { label: "Try a smaller amount" }
  }
  if (r.includes("supply cap")) return { label: "Supply cap reached" }
  if (r.includes("paused")) return { label: "Market paused" }
  if (r.includes("price")) return { label: "Price unavailable" }
  if (r.includes("not supported") || r.includes("unavailable") || r.includes("disabled")) {
    return { label: "Not available here" }
  }
  if (r.includes("nothing to claim")) return { label: "Nothing to claim" }
  if (r.includes("select rewards")) return { label: "Select rewards" }
  if (r.includes("no deposited position") || r.includes("position does not exist")) {
    return { label: "Nothing to withdraw" }
  }
  if (r.includes("positive") || r.includes("greater than zero")) return { label: "Enter an amount" }

  // Non-alarming catch-all — most remaining blocks are "amount is too big".
  return { label: "Try a smaller amount" }
}
