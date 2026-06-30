// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import schema from "./schema"
import { api } from "./_generated/api"

const modules = import.meta.glob("./**/*.*s")

describe("seed administration", () => {
  test("rejects seed actions without the deployment secret", async () => {
    const t = convexTest(schema, modules)

    await expect(
      t.action(api.seedAdmin.upsertMarkets, {
        seedSecret: "not-the-deployment-secret",
        rows: [],
      }),
    ).rejects.toThrow("Unauthorized seed write")
  })
})
