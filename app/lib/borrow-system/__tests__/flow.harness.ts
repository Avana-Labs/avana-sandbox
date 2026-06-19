import { act, renderHook } from "@testing-library/react"
import { parseFixed, type BorrowAction, type BorrowSystemState } from "@/app/lib/credit-engine"
import { makeExampleBorrowSystemState } from "@/app/lib/credit-engine/__tests__/fixtures"
import { SandboxTransactionAdapter } from "@/app/lib/borrow-system/sandbox-transaction-adapter"
import { useBorrowActionBox } from "@/app/lib/borrow-system/use-borrow-action-box"

export function createBorrowFlowHarness(initialState = makeExampleBorrowSystemState()) {
  let state: BorrowSystemState = initialState

  const adapter = new SandboxTransactionAdapter({
    readState: () => state,
    writeState: (nextState) => {
      state = nextState
    },
    now: () => Date.UTC(2026, 5, 19),
    generateId: (() => {
      let count = 0
      return (prefix: string) => `${prefix}-${++count}`
    })(),
  })

  const session = {
    createIntent: (action: BorrowAction) => adapter.createIntent(action),
    previewTransaction: (intent: ReturnType<typeof adapter.createIntent>) => adapter.previewTransaction(intent),
    executeTransaction: (intent: ReturnType<typeof adapter.createIntent>) => adapter.executeTransaction(intent),
    isPending: false,
  }

  return {
    adapter,
    session,
    getState: () => state,
    renderActionBox: () => renderHook(() => useBorrowActionBox(session)),
  }
}

export async function runBorrowActionBoxFlow(
  harness: ReturnType<typeof createBorrowFlowHarness>,
  action: BorrowAction,
) {
  const { result } = harness.renderActionBox()

  await act(async () => {
    await result.current.prepareAction(action)
  })

  await act(async () => {
    await result.current.advance()
  })

  await act(async () => {
    result.current.setStage("approve")
  })

  let executeResult: Awaited<ReturnType<typeof harness.session.executeTransaction>> | null = null

  await act(async () => {
    executeResult = await result.current.advance()
  })

  return { result, executeResult }
}

export { parseFixed }
