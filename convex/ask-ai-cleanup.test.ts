// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import { internal } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.*s")

describe("deprecated Ask AI attachment cleanup", () => {
  test("is dry-run by default and deletes storage only when explicitly executed", async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const storageId = await ctx.storage.store(new Blob(["old attachment"], { type: "text/plain" }))
      await ctx.db.insert("askAIAttachments", {
        ownerSubject: "owner",
        threadId: "thread",
        storageId,
        name: "old.txt",
        mediaType: "text/plain",
        size: 14,
        status: "uploaded",
        createdAt: 1,
        updatedAt: 1,
      })
    })

    const audit = await t.mutation(internal.askAICleanup.cleanupAttachmentPage, { batchSize: 10 })
    expect(audit).toMatchObject({ matched: 1, deleted: 0, dryRun: true, isDone: true })
    expect(await t.run((ctx) => ctx.db.query("askAIAttachments").collect())).toHaveLength(1)

    const cleanup = await t.mutation(internal.askAICleanup.cleanupAttachmentPage, { batchSize: 10, execute: true })
    expect(cleanup).toMatchObject({ matched: 1, deleted: 1, dryRun: false, isDone: true })
    expect(await t.run((ctx) => ctx.db.query("askAIAttachments").collect())).toHaveLength(0)
  })
})
