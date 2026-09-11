import { v } from "convex/values"
import { query, type MutationCtx, type QueryCtx } from "./_generated/server"
import { ASK_AI_WALLET_REQUIRED } from "../app/lib/ask-ai/config"
import { getAuthedWallet } from "./sandbox/auth"
import { buildPositionContext } from "../app/lib/ask-ai/position-context"
import { positionInputFromRows } from "../app/lib/ask-ai/position-context-adapter"
import {
  buildReturnsRun,
  buildRiskRun,
  buildStressRun,
  routeAskAiMode,
  type AskAiMode,
  type AskAiRun,
} from "../app/lib/ask-ai/mode-run"

/**
 * Live read path for an Ask AI mode-run (Phase 3 backend).
 *
 * Reads the owner's position rows once, maps them through the pure adapter into a
 * single immutable PositionContext, and hands that snapshot to the deterministic mode
 * assembler. Read-only: it returns the typed run; persistence (askAiRuns.record) and
 * rendering are separate steps. Nothing calls this yet.
 */

// Same rationale as convex/askAITools.ts ASK_AI_DATA_PROVENANCE: this is a sandbox-first
// app; all position data is synthetic sandbox state, so the only honest provenance is
// "sandbox" until a real connected-wallet/on-chain read path lands.
const PROVENANCE = "sandbox"

type ReadCtx = Pick<QueryCtx | MutationCtx, "auth" | "db">

type ModeRunResult =
  { walletRequired: true; message: string } | { walletRequired: false; rerouted: boolean; run: AskAiRun }

async function readModeRun(
  ctx: ReadCtx,
  args: { mode: AskAiMode; queryText: string; positionId: string },
): Promise<ModeRunResult> {
  const wallet = await getAuthedWallet(ctx)
  if (!wallet) return { walletRequired: true, message: ASK_AI_WALLET_REQUIRED }

  const positions = await ctx.db
    .query("positions")
    .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
    .collect()
  const position = positions.find((row) => row._id === args.positionId && row.status === "open")
  if (!position) throw new Error("Position not found")

  const market = await ctx.db
    .query("markets")
    .withIndex("by_slug", (q) => q.eq("slug", position.marketSlug))
    .first()
  const assetId = position.assetId
  const parameter = assetId
    ? await ctx.db
        .query("multiplyTokenParameters")
        .withIndex("by_symbol", (q) => q.eq("symbol", assetId))
        .unique()
    : null

  const asOf = Date.now()
  const snapshot = buildPositionContext(positionInputFromRows({ position, market, parameter, asOf }), asOf)

  const route = routeAskAiMode(args.queryText, args.mode)
  const options = { queryText: args.queryText, provenance: PROVENANCE }
  const run =
    route.mode === "risk"
      ? buildRiskRun(snapshot, options)
      : route.mode === "stress"
        ? buildStressRun(snapshot, options)
        : buildReturnsRun(snapshot, options)

  return { walletRequired: false, rerouted: route.rerouted, run }
}

export const buildModeRun = query({
  args: {
    mode: v.union(v.literal("risk"), v.literal("returns"), v.literal("stress")),
    queryText: v.string(),
    positionId: v.string(),
  },
  handler: readModeRun,
})
