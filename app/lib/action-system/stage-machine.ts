import type { ActionStage } from "./contracts"

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
  | "block"

export function nextActionStage(stage: ActionStage, event: ActionStageEvent): ActionStage {
  switch (stage) {
    case "select":
      if (event === "continue") return "configure"
      if (event === "block") return "blocked"
      return stage
    case "configure":
      if (event === "review") return "review"
      if (event === "block") return "blocked"
      if (event === "back" || event === "reset") return "select"
      return stage
    case "review":
      if (event === "submit") return "wallet_sign"
      if (event === "back" || event === "reset") return "configure"
      if (event === "block") return "blocked"
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
    case "blocked":
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
}) {
  if (options.stage === "success") return "View dashboard"
  if (options.stage === "processing") return "Processing…"
  if (options.stage === "wallet_sign" || options.stage === "approve_allowance") return options.verb
  if (options.stage === "error") return options.verb
  if (options.stage === "review") return options.verb
  if (!options.isValid || options.blockedReason) return "Enter an amount"
  if (options.stage === "configure") return "Review"
  return options.verb
}

export function shouldDisablePrimaryCta(options: {
  stage: ActionStage
  isValid: boolean
  isPending: boolean
  blockedReason?: string | null
}) {
  if (options.isPending) return true
  if (options.stage === "processing") return true
  if (options.stage === "wallet_sign" || options.stage === "approve_allowance") return true
  if (options.blockedReason) return true
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
