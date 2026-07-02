export type ActionSubmitResult = {
  receipt: {
    status: string
    error?: string | null
    hash?: string | null
  }
}

export const ALLOWANCE_SIMULATED_MS = 900
export const WALLET_SIGN_SIMULATED_MS = 1200
/**
 * Long enough for the processing narration (~5 readable lines) to fully play before the
 * receipt appears — see ProcessingNarration. Kept synthetic-only (`simulated`).
 */
export const PROCESSING_SIMULATED_MS = 4200

// Unit tests (vitest) drive the whole flow with real timers; skip the UX pacing so they
// don't wait several seconds. The stage sequence itself is still exercised. The real app
// and Playwright E2E (which don't set VITEST) keep the readable delays.
const SKIP_SIMULATED_DELAYS = typeof process !== "undefined" && process.env?.VITEST === "true"

function delay(ms: number) {
  if (SKIP_SIMULATED_DELAYS) return Promise.resolve()
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export async function runActionSubmitFlow<T extends ActionSubmitResult>(options: {
  simulated: boolean
  needsAllowance?: boolean
  onStage: (stage: import("./contracts").ActionStage) => void
  execute: () => Promise<T>
}): Promise<T> {
  if (options.needsAllowance) {
    options.onStage("approve_allowance")
    if (options.simulated) await delay(ALLOWANCE_SIMULATED_MS)
  }

  options.onStage("wallet_sign")
  if (options.simulated) await delay(WALLET_SIGN_SIMULATED_MS)

  options.onStage("processing")
  if (options.simulated) await delay(PROCESSING_SIMULATED_MS)

  return options.execute()
}
