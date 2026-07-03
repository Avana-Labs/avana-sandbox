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

/**
 * Ceiling on how long the "processing" stage waits for execute() (the wallet/Convex write)
 * to settle. Without it, a stalled Convex socket or dropped connection under load left the
 * submit awaiting forever — the CTA stuck at "Processing…" (disabled) with no recovery. On
 * timeout we reject so the caller transitions to the error stage and clears its pending flag.
 */
export const EXECUTE_TIMEOUT_MS = 30_000
export const EXECUTE_TIMEOUT_MESSAGE =
  "The transaction timed out. Check your connection and try again."

function delay(ms: number) {
  if (SKIP_SIMULATED_DELAYS) return Promise.resolve()
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/**
 * Resolve/reject with `promise`, but reject after `ms` if it hasn't settled. The timer is
 * always cleared once the race settles so a resolved submit never leaves a dangling timeout.
 * A rejected timeout does NOT cancel the underlying write; the intentId idempotency key means
 * a later server commit or a retry collapses onto one row rather than double-applying.
 */
function raceWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  if (!ms || ms <= 0) return promise
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(EXECUTE_TIMEOUT_MESSAGE)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}

export async function runActionSubmitFlow<T extends ActionSubmitResult>(options: {
  simulated: boolean
  needsAllowance?: boolean
  /** Override the execute() timeout (ms). 0/undefined uses EXECUTE_TIMEOUT_MS. */
  timeoutMs?: number
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

  return raceWithTimeout(options.execute(), options.timeoutMs ?? EXECUTE_TIMEOUT_MS)
}
