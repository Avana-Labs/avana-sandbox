import {
  addCollateralToReachHealthFactor,
  repayToReachHealthFactor,
  simulateStress,
  type ComparableLPInput,
  type PositionContext,
} from "./position-context"
import {
  DEFAULT_STRESS_SHOCKS_PCT,
  buildAssumptionsWidget,
  buildBorrowCapacityWidget,
  buildCarrySummaryWidget,
  buildCollateralBreakdownWidget,
  buildComparableLpWidget,
  buildFeeVsInterestWidget,
  buildLiquidationBoundaryWidget,
  buildRiskSummaryWidget,
  buildStressTilesWidget,
  type AskAiAction,
  type AskAiWidget,
} from "./widgets"

/**
 * Deterministic Ask AI mode-run assembly (Phase 2 contract / Phase 3 backend).
 *
 * A "mode" is not a prompt string — it is this: a mode + the run's single snapshot +
 * a typed list of widgets + a typed list of actions. Each `build*Run` composes the
 * widgets and defensive actions for one mode off a single {@link PositionContext}, so
 * the whole answer is reproducible and testable. The model fills `narrative`; every
 * number lives in the widgets/actions, which come only from the engine.
 *
 * Unwired: no Convex table or UI imports this yet.
 */

export type AskAiMode = "risk" | "returns" | "stress"

export type AskAiRun = {
  mode: AskAiMode
  queryText: string
  snapshotId: string
  asOf: number
  /** Model-authored prose; the assembler leaves it empty so numbers never live only in text. */
  narrative: string
  widgets: AskAiWidget[]
  actions: AskAiAction[]
}

/** Health factor a defensive action lifts a position back up to. */
const SAFE_HEALTH_FACTOR = 1.5

type RunOptions = {
  queryText: string
  provenance: string
  safeHealthFactor?: number
}

const usd = (value: number) => Math.round(value * 100) / 100

export function buildRiskRun(ctx: PositionContext, options: RunOptions): AskAiRun {
  const safe = options.safeHealthFactor ?? SAFE_HEALTH_FACTOR
  const actions: AskAiAction[] = []
  if (ctx.healthFactor !== null && ctx.healthFactor < safe) {
    const repay = repayToReachHealthFactor(ctx, safe)
    const addCollateral = addCollateralToReachHealthFactor(ctx, safe)
    if (repay > 0)
      actions.push({
        id: "risk-repay",
        kind: "repay",
        label: `Repay $${usd(repay)} of debt`,
        amountUsd: usd(repay),
        rationale: `Lifts your health factor to ${safe.toFixed(2)}.`,
        resultingHealthFactor: safe,
      })
    if (addCollateral > 0)
      actions.push({
        id: "risk-add-collateral",
        kind: "add_collateral",
        label: `Add $${usd(addCollateral)} of collateral`,
        amountUsd: usd(addCollateral),
        rationale: `Lifts your health factor to ${safe.toFixed(2)} without repaying.`,
        resultingHealthFactor: safe,
      })
  }
  return {
    mode: "risk",
    queryText: options.queryText,
    snapshotId: ctx.snapshotId,
    asOf: ctx.asOf,
    narrative: "",
    widgets: [
      buildRiskSummaryWidget(ctx),
      buildBorrowCapacityWidget(ctx),
      buildCollateralBreakdownWidget(ctx),
      buildLiquidationBoundaryWidget(ctx),
      buildAssumptionsWidget(ctx, { provenance: options.provenance }),
    ],
    actions,
  }
}

export function buildStressRun(
  ctx: PositionContext,
  options: RunOptions & { shocksPct?: readonly number[] },
): AskAiRun {
  const shocks = options.shocksPct ?? DEFAULT_STRESS_SHOCKS_PCT
  const actions: AskAiAction[] = []
  // Defensive action keyed to the deepest preset: how much debt to repay to keep the
  // position solvent (HF >= 1) even after that shock.
  const worstShock = Math.min(...shocks)
  const worst = simulateStress(ctx, worstShock)
  if (worst.liquidated && ctx.debtValueUsd > 0) {
    const survivingDebtUsd = worst.shockedCollateralValueUsd * (ctx.liquidationThresholdPct / 100)
    const repay = Math.max(0, ctx.debtValueUsd - survivingDebtUsd)
    if (repay > 0)
      actions.push({
        id: `stress-repay-${Math.abs(worstShock)}`,
        kind: "repay",
        label: `Repay $${usd(repay)} to survive a ${Math.abs(worstShock)}% drop`,
        amountUsd: usd(repay),
        rationale: `Keeps your health factor at or above 1.0 after a ${Math.abs(worstShock)}% collateral drop.`,
        resultingHealthFactor: 1,
      })
  }
  return {
    mode: "stress",
    queryText: options.queryText,
    snapshotId: ctx.snapshotId,
    asOf: ctx.asOf,
    narrative: "",
    widgets: [
      buildStressTilesWidget(ctx, shocks),
      buildLiquidationBoundaryWidget(ctx),
      buildCollateralBreakdownWidget(ctx),
      buildAssumptionsWidget(ctx, { provenance: options.provenance }),
    ],
    actions,
  }
}

export function buildReturnsRun(
  ctx: PositionContext,
  options: RunOptions & { comparableCandidates?: ComparableLPInput[] },
): AskAiRun {
  const widgets: AskAiWidget[] = [buildCarrySummaryWidget(ctx), buildFeeVsInterestWidget(ctx)]
  if (options.comparableCandidates && options.comparableCandidates.length > 0)
    widgets.push(buildComparableLpWidget(ctx, options.comparableCandidates))
  widgets.push(buildAssumptionsWidget(ctx, { provenance: options.provenance }))
  return {
    mode: "returns",
    queryText: options.queryText,
    snapshotId: ctx.snapshotId,
    asOf: ctx.asOf,
    narrative: "",
    widgets,
    actions: [],
  }
}

// Leverage questions are a risk question, not a returns question: net carry with
// leverage is dominated by liquidation risk, so a Returns run would be misleading.
const LEVERAGE_PATTERN = /\b(leverage|leveraged|lever|loop|looping|multiply|fold(?:ing)?|recursive)\b/i

export type ModeRoute = { mode: AskAiMode; rerouted: boolean }

/** Deterministically resolve the mode, rerouting leverage questions asked in Returns mode to Risk. */
export function routeAskAiMode(queryText: string, requestedMode: AskAiMode): ModeRoute {
  if (requestedMode === "returns" && LEVERAGE_PATTERN.test(queryText)) return { mode: "risk", rerouted: true }
  return { mode: requestedMode, rerouted: false }
}

const STRESS_PATTERN =
  /\b(stress|crash\w*|scenario|what if|drops?|dropped|falls?|fell|plunges?|dumps?|down\s*\d|[-–]\s*\d+\s*%)\b/i
const RISK_PATTERN =
  /\b(risk|risky|safe|safety|unsafe|liquidat\w*|health\s*factor|underwater|buffer|margin\s*call|how\s*(safe|risky))\b/i
const RETURNS_PATTERN = /\b(returns?|carry|yield|apr|apy|profit|earn\w*|income|fees?)\b/i

/**
 * Classify a free-text query into a deterministic mode, or null when no mode clearly
 * applies (the turn then falls through to the normal chat answer). Stress wins over Risk
 * when a scenario is described ("what if ETH falls 20%"), and Risk over Returns.
 */
export function classifyAskAiMode(queryText: string): AskAiMode | null {
  if (STRESS_PATTERN.test(queryText)) return "stress"
  if (RISK_PATTERN.test(queryText)) return "risk"
  if (RETURNS_PATTERN.test(queryText)) return "returns"
  return null
}
