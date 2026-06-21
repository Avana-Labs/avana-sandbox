import type { ActionStage } from "./contracts"

export function nextActionStage(stage: ActionStage, event: "continue" | "submit" | "success" | "error" | "reset" | "block"): ActionStage {
  switch (stage) {
    case "select":
      if (event === "continue") return "configure"
      if (event === "block") return "blocked"
      return stage
    case "configure":
      if (event === "submit") return "submitting"
      if (event === "block") return "blocked"
      if (event === "reset") return "select"
      return stage
    case "submitting":
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

export function primaryCtaLabel(options: {
  stage: ActionStage
  verb: string
  blockedReason: string | null
  isValid: boolean
}) {
  if (options.stage === "success") return "View dashboard"
  if (options.stage === "submitting") return options.verb
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
  return stage === "submitting"
}

export function shouldDisablePrimaryCta(options: { stage: ActionStage; isValid: boolean; isPending: boolean }) {
  if (options.isPending) return true
  if (options.stage === "submitting") return true
  if (options.stage === "configure" && !options.isValid) return true
  return false
}
