import type { ActionBlockedUi, ActionKind, ActionProduct } from "./contracts"
import { actionPagePath } from "./contracts"

export function blockedUiForMissingWalletAsset(symbol: string, verb = "deposit"): ActionBlockedUi {
  return {
    title: `That's more practice ${symbol} than you hold`,
    description: `You've used all your sandbox ${symbol}. Lower the amount, or explore another asset — every market is available with your practice funds.`,
    primaryCtaLabel: null,
    primaryCtaHref: null,
    secondaryCtaLabel: "Got it",
  }
}

export function blockedUiForMissingWalletLp(marketLabel: string): ActionBlockedUi {
  return {
    title: "That's more practice LP than you hold here",
    description: `You've used all your sandbox ${marketLabel} LP. Lower the amount, or open another pool — every market stays available with your practice funds.`,
    primaryCtaLabel: null,
    primaryCtaHref: null,
    secondaryCtaLabel: "Got it",
  }
}

export function mapPreviewToBlockedUi(options: {
  product: ActionProduct
  kind: ActionKind
  blockedReason: string | null
}): ActionBlockedUi | null {
  if (!options.blockedReason) return null

  const reason = options.blockedReason.toLowerCase()

  if (reason.includes("insufficient") && reason.includes("balance")) {
    return {
      title: options.product === "lend" ? "You don't have this asset in your wallet" : "No balance available",
      description: options.blockedReason,
      primaryCtaLabel: options.product === "borrow" && options.kind === "borrow" ? "Deposit" : null,
      primaryCtaHref:
        options.product === "borrow" && options.kind === "borrow" ? actionPagePath("borrow", "supply") : null,
      secondaryCtaLabel: "Got it",
    }
  }

  if (reason.includes("borrowing unavailable") || (reason.includes("borrow") && reason.includes("unavailable"))) {
    return {
      title: "Borrowing unavailable",
      description:
        options.blockedReason ??
        "Assets in this market may be unavailable because borrowing is disabled, borrow caps have been reached, or no liquidity is available. Try a different market or check back later.",
      primaryCtaLabel: null,
      primaryCtaHref: null,
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
