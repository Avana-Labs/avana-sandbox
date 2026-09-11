// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.*s")

const riskWidget = {
  type: "risk_summary",
  healthFactor: 1.6,
  bufferPct: 38,
  currentLtv: 0.4,
  riskLevel: "low",
}

describe("askAiRuns", () => {
  test("records a typed mode-run and reads it back for the owner", async () => {
    const t = convexTest(schema, modules)
    const owner = t.withIdentity({ subject: "owner-1" })
    const runId = await owner.mutation(api.askAiRuns.record, {
      threadId: "thread-1",
      mode: "risk",
      queryText: "am I safe?",
      snapshotId: "snap_abc",
      asOf: 1_700_000_000_000,
      narrative: "",
      widgets: [riskWidget],
      actions: [],
    })
    const run = await owner.query(api.askAiRuns.get, { runId })
    expect(run).toMatchObject({ mode: "risk", snapshotId: "snap_abc", ownerSubject: "owner-1" })
    expect(run?.widgets).toHaveLength(1)
  })

  test("rejects an unknown widget discriminant at the write boundary", async () => {
    const t = convexTest(schema, modules)
    const owner = t.withIdentity({ subject: "owner-1" })
    await expect(
      owner.mutation(api.askAiRuns.record, {
        mode: "risk",
        queryText: "x",
        snapshotId: "s",
        asOf: 1,
        narrative: "",
        widgets: [{ type: "bogus" }],
        actions: [],
      }),
    ).rejects.toThrow(/Unknown Ask AI widget type/)
  })

  test("does not leak another owner's run", async () => {
    const t = convexTest(schema, modules)
    const owner = t.withIdentity({ subject: "owner-1" })
    const other = t.withIdentity({ subject: "owner-2" })
    const runId = await owner.mutation(api.askAiRuns.record, {
      mode: "stress",
      queryText: "x",
      snapshotId: "s",
      asOf: 1,
      narrative: "",
      widgets: [],
      actions: [],
    })
    expect(await other.query(api.askAiRuns.get, { runId })).toBeNull()
  })

  test("requires a session", async () => {
    const t = convexTest(schema, modules)
    await expect(
      t.mutation(api.askAiRuns.record, {
        mode: "returns",
        queryText: "x",
        snapshotId: "s",
        asOf: 1,
        narrative: "",
        widgets: [],
        actions: [],
      }),
    ).rejects.toThrow(/session required/)
  })
})
