import { ConvexHttpClient } from "convex/browser"
import { api } from "../convex/_generated/api"
import {
  TEST_WALLET_COLLATERAL_SEED_ROWS,
  TEST_WALLET_DEBTS_SEED_ROWS,
  TEST_WALLET_CLAIMS_SEED_ROWS,
} from "../app/lib/convex-seed/inputs/test-wallet-portfolio-seed"
import { TEST_WALLET_ADDRESS } from "../app/lib/convex-seed/test-wallet"

async function main() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  const seedSecret = process.env.CONVEX_SEED_SECRET
  if (!url || !seedSecret) throw new Error("missing CONVEX env")
  const client = new ConvexHttpClient(url)
  const wallet = TEST_WALLET_ADDRESS
  const strip = <T extends { wallet: string }>(rows: T[]) => rows.map(({ wallet: _w, ...rest }) => rest)

  const c = await client.action(api.seedAdmin.upsertWalletCollateralPositions, {
    seedSecret,
    wallet,
    rows: strip(TEST_WALLET_COLLATERAL_SEED_ROWS),
  })
  const d = await client.action(api.seedAdmin.upsertWalletDebts, {
    seedSecret,
    wallet,
    rows: strip(TEST_WALLET_DEBTS_SEED_ROWS),
  })
  const cl = await client.action(api.seedAdmin.upsertWalletClaimPositions, {
    seedSecret,
    wallet,
    rows: strip(TEST_WALLET_CLAIMS_SEED_ROWS),
  })
  const balanceRows = [
    { assetId: "eth", amount: 0.012, sourceType: "wallet" as const, assetKind: "wallet" as const, symbol: "ETH", valueUsd6: String(Math.round(0.012 * 1934 * 1_000_000)) },
    { assetId: "usdc", amount: 840, sourceType: "wallet" as const, assetKind: "wallet" as const, symbol: "USDC", valueUsd6: String(840 * 1_000_000) },
    { assetId: "link", amount: 24, sourceType: "wallet" as const, assetKind: "wallet" as const, symbol: "LINK", valueUsd6: String(24 * 18 * 1_000_000) },
    { assetId: "eth-usdc-lp", amount: 6.4, sourceType: "wallet" as const, assetKind: "lp" as const, symbol: "ETH-USDC LP", valueUsd6: String(Math.round(6.4 * 125 * 1_000_000)) },
  ]
  const bal = await client.action(api.seedAdmin.upsertWalletBalances, {
    seedSecret,
    wallet,
    rows: balanceRows,
  })
  console.log({ wallet, collateral: c, debts: d, claims: cl, balances: bal })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
