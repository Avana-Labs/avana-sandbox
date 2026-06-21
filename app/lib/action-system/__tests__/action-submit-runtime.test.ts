import { describe, expect, it, vi } from "vitest"
import { runActionSubmitFlow } from "@/app/lib/action-system/action-submit-runtime"

describe("runActionSubmitFlow", () => {
  it("advances through allowance, wallet sign, and processing stages", async () => {
    vi.useFakeTimers()
    const stages: string[] = []
    const onStage = (stage: string) => stages.push(stage)

    const promise = runActionSubmitFlow({
      simulated: true,
      needsAllowance: true,
      onStage,
      execute: async () => ({
        receipt: { status: "success", hash: "sim-test" },
      }),
    })

    await vi.runAllTimersAsync()
    const result = await promise

    expect(stages).toEqual(["approve_allowance", "wallet_sign", "processing"])
    expect(result.receipt.hash).toBe("sim-test")
    vi.useRealTimers()
  })
})
