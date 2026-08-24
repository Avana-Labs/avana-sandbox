// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import { internal } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.*s")
const WALLET = "0xabc0000000000000000000000000000000000001"

describe("wallet sessions migration", () => {
  test("copies legacy sessions once without overwriting the destination", async () => {
    const t = convexTest(schema, modules)
    await t.run((ctx) =>
      ctx.db.insert("sandboxSessions", {
        wallet: WALLET,
        authSubject: WALLET,
        seedVersion: 4,
        seededAt: 100,
        lastSeenAt: 200,
        umbrellaSeeded: true,
      }),
    )

    const first = await t.mutation(internal.wallet.sessions.migrateSandboxSessions, { batchSize: 10 })
    const second = await t.mutation(internal.wallet.sessions.migrateSandboxSessions, { batchSize: 10 })
    expect(first).toMatchObject({ migrated: 1, skippedExisting: 0, isDone: true })
    expect(second).toMatchObject({ migrated: 0, skippedExisting: 1, isDone: true })

    const session = await t.run((ctx) =>
      ctx.db
        .query("walletSessions")
        .withIndex("by_wallet", (q) => q.eq("wallet", WALLET))
        .unique(),
    )
    expect(session).toMatchObject({ seedVersion: 4, lastSeenAt: 200, umbrellaSeeded: true })
  })
})
