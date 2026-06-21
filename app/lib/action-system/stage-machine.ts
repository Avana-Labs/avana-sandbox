import type { ActionStage } from "./contracts"

export type ActionStageEvent =
  | "continue"
  | "submit"
  | "allowance_complete"
  | "signed"
  | "confirmed"
  | "success"
  | "error"
  | "reset"
  | "block"

export function nextActionStage(stage: ActionStage, event: ActionStageEvent): ActionStage {
  switch (stage) {
    case "select":
      if (event === "continue") return "configure"
      if (event === "block") return "blocked"
      return stage
    case "configure":
      if (event === "submit") return "wallet_sign"
      if (event === "block") return "blocked"
      if (event === "reset") return "select"
      return stage
    case "approve_allowance":
      if (event === "allowance_complete") return "wallet_sign"
      if (event === "error") return "error"
      return stage
    case "wallet_sign":
      if (event === "signed") return "processing"
      if (event === "error") return "error"
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
  if (options.blockedReason) return options.blockedReason
  if (!options.isValid) return "Enter an amount"
  return options.verb
}

export function secondaryCtaLabel(stage: ActionStage) {
  if (stage === "success") return "Done"
  return "Cancel"
}

export function shouldShowWalletToast(stage: ActionStage) {
  return stage === "wallet_sign" || stage === "approve_allowance"
}

export function shouldDisablePrimaryCta(options: { stage: ActionStage; isValid: boolean; isPending: boolean }) {
  if (options.isPending) return true
  if (options.stage === "processing") return true
  if (options.stage === "wallet_sign" || options.stage === "approve_allowance") return true
  if (options.stage === "configure" && !options.isValid) return true
  return false
}

export function walletToastMessage(stage: ActionStage, amountLabel: string) {
  if (stage === "approve_allowance") {
    return `To continue, approve token allowance for ${amountLabel} in your wallet.`
  }
  return `To continue, confirm ${amountLabel} in your wallet.`
}
