import type { ActionBlockedUi, ActionKind, ActionProduct } from "./contracts"
import { actionPagePath } from "./contracts"

export function mapPreviewToBlockedUi(options: {
  product: ActionProduct
  kind: ActionKind
  blockedReason: string | null
}): ActionBlockedUi | null {
  if (!options.blockedReason) return null

  const reason = options.blockedReason.toLowerCase()

  if (reason.includes("insufficient") && reason.includes("balance")) {
    return {
      title: "No balance available",
      description: options.blockedReason,
      primaryCtaLabel: options.product === "borrow" && options.kind === "borrow" ? "Deposit" : null,
      primaryCtaHref:
        options.product === "borrow" && options.kind === "borrow" ? actionPagePath("borrow", "supply") : null,
      secondaryCtaLabel: "Got it",
    }
  }

  if (reason.includes("deposit") && (reason.includes("before") || reason.includes("collateral"))) {
    return {
      title: "You need to deposit an asset before you can borrow.",
      description: "To borrow you need to deposit a compatible asset to be used as collateral for your loan.",
      primaryCtaLabel: "Deposit",
      primaryCtaHref: actionPagePath("borrow", "supply"),
      secondaryCtaLabel: "Got it",
    }
  }

  if (reason.includes("unavailable") || reason.includes("disabled") || reason.includes("liquidity")) {
    return {
      title: "Action unavailable",
      description: options.blockedReason,
      primaryCtaLabel: null,
      primaryCtaHref: null,
      secondaryCtaLabel: "Got it",
    }
  }

  return {
    title: "Action unavailable",
    description: options.blockedReason,
    primaryCtaLabel: null,
    primaryCtaHref: null,
    secondaryCtaLabel: "Got it",
  }
}
