import type { ActionStage } from "./contracts"
import { blockedCtaLabel } from "./blocked-ui"

export type ActionStageEvent =
  | "continue"
  | "review"
  | "submit"
  | "allowance_complete"
  | "signed"
  | "confirmed"
  | "success"
  | "error"
  | "reset"
  | "back"

export function nextActionStage(stage: ActionStage, event: ActionStageEvent): ActionStage {
  switch (stage) {
    case "select":
      if (event === "continue") return "configure"
      return stage
    case "configure":
      if (event === "review") return "review"
      if (event === "back" || event === "reset") return "select"
      return stage
    case "review":
      if (event === "submit") return "wallet_sign"
      if (event === "back" || event === "reset") return "configure"
      return stage
    case "approve_allowance":
      if (event === "allowance_complete") return "wallet_sign"
      if (event === "error") return "error"
      if (event === "back") return "review"
      return stage
    case "wallet_sign":
      if (event === "signed") return "processing"
      if (event === "error") return "error"
      if (event === "back") return "review"
      return stage
    case "processing":
      if (event === "success") return "success"
      if (event === "error") return "error"
      return stage
    case "success":
    case "error":
      if (event === "reset") return "configure"
      return stage
    default:
      return stage
  }
}

export function isConfigureVisibleStage(stage: ActionStage) {
  return stage === "configure" || stage === "approve_allowance" || stage === "wallet_sign" || stage === "error"
}

export function isReviewStage(stage: ActionStage) {
  return stage === "review"
}

export function secondaryCtaLabel(stage: ActionStage, options?: { canGoBack?: boolean }) {
  if (stage === "success") return "Done"
  if (stage === "review") return "Back"
  if (stage === "configure" && options?.canGoBack) return "Back"
  return "Cancel"
}

export function primaryCtaLabel(options: {
  stage: ActionStage
  verb: string
  blockedReason: string | null
  isValid: boolean
  amountEntered?: boolean
  /** Asset spent by the action, used for "Insufficient {SYMBOL}" labels. */
  blockedSymbol?: string
}) {
  if (options.stage === "success") return "View dashboard"
  if (options.stage === "processing") return "Processing…"
  if (options.stage === "wallet_sign" || options.stage === "approve_allowance") return options.verb
  if (options.stage === "error") return options.verb
  if (options.stage === "review") return options.verb
  // The button IS the gate: a blocked action shows a short reason in-place
  // instead of a pop-up. See blockedCtaLabel for the full mapping.
  if (options.blockedReason) return blockedCtaLabel(options.blockedReason, { symbol: options.blockedSymbol }).label
  if (!options.isValid) {
    if (options.amountEntered) return "Enter a valid amount"
    return "Enter an amount"
  }
  if (options.stage === "configure") return "Review"
  return options.verb
}

export function shouldDisablePrimaryCta(options: {
  stage: ActionStage
  isValid: boolean
  isPending: boolean
  blockedReason?: string | null
  /** When the block routes the user elsewhere (e.g. pledge collateral) the CTA
   *  stays active so the tap can navigate — don't disable it. */
  blockedRedirect?: boolean
}) {
  if (options.isPending) return true
  if (options.stage === "processing") return true
  if (options.stage === "wallet_sign" || options.stage === "approve_allowance") return true
  if (options.blockedReason && !options.blockedRedirect) return true
  if (options.stage === "configure" && !options.isValid) return true
  if (options.stage === "review" && !options.isValid) return true
  return false
}

export function shouldShowWalletToast(stage: ActionStage) {
  return stage === "wallet_sign" || stage === "approve_allowance"
}

export function walletToastMessage(stage: ActionStage, amountLabel: string) {
  if (stage === "approve_allowance") {
    return `To continue, approve token allowance for ${amountLabel} in your wallet.`
  }
  return `To continue, confirm ${amountLabel} in your wallet.`
}

export function reviewStageTitle(verb: string) {
  return `Review ${verb.toLowerCase()}`
}
