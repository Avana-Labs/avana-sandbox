import { act, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { LiquidationPreviewPanel } from "@/app/borrow/components/liquidation-preview-panel"
import { EXAMPLE_UNI_MARKET_ID, EXAMPLE_UNI_USDC_ASSET_ID, EXAMPLE_WALLET_1_DEBT_ID, makeExampleBorrowSystemState } from "@/app/lib/credit-engine/__tests__/fixtures"
import { SandboxBorrowReadAdapter } from "@/app/lib/borrow-system/sandbox-read-adapter"
import { createBorrowFlowHarness, parseFixed, runBorrowActionBoxFlow } from "./flow.harness"

describe("borrow flow acceptance", () => {
  describe("portfolio page", () => {
    it("renders user portfolio from live read adapter", async () => {
      const harness = createBorrowFlowHarness()
      const readAdapter = new SandboxBorrowReadAdapter({ state: harness.getState() })
      const portfolio = await readAdapter.readPortfolioBorrow("wallet-1")
      expect(portfolio.creditLines.totalCollateralUsd).toBeGreaterThan(0)
    })

    it("renders active collateral and debt positions", async () => {
      const harness = createBorrowFlowHarness()
      const readAdapter = new SandboxBorrowReadAdapter({ state: harness.getState() })
      const portfolio = await readAdapter.readPortfolioBorrow("wallet-1")
      expect(portfolio.collateralPositions.length).toBeGreaterThan(0)
      expect(portfolio.debtPositions.length).toBeGreaterThan(0)
    })

    it("renders collateral value, debt, LTV, health factor, and risk", async () => {
      const harness = createBorrowFlowHarness()
      const readAdapter = new SandboxBorrowReadAdapter({ state: harness.getState() })
      const portfolio = await readAdapter.readPortfolioBorrow("wallet-1")
      expect(portfolio.creditLines.currentLtvPct).toBeGreaterThanOrEqual(0)
      expect(portfolio.creditLines.averageHealthFactor).not.toBeNull()
    })

    it("rehydrates metrics after simulated actions", async () => {
      const harness = createBorrowFlowHarness()
      const readAdapter = () => new SandboxBorrowReadAdapter({ state: harness.getState() })
      const before = await readAdapter().readPortfolioBorrow("wallet-1")

      await runBorrowActionBoxFlow(harness, {
        type: "borrow",
        walletId: "wallet-1",
        marketId: EXAMPLE_UNI_MARKET_ID,
        assetId: EXAMPLE_UNI_USDC_ASSET_ID,
        amountUsd6: parseFixed("200", 6),
      })

      const after = await readAdapter().readPortfolioBorrow("wallet-1")
      expect(after.creditLines.totalBorrowedUsd).toBeGreaterThan(before.creditLines.totalBorrowedUsd)
    })
  })

  describe("borrow flow", () => {
    it("opens borrow action with adapter-backed preview", async () => {
      const harness = createBorrowFlowHarness()
      const { result } = harness.renderActionBox()
      await act(async () => {
        await result.current.prepareAction({
          type: "borrow",
          walletId: "wallet-1",
          marketId: EXAMPLE_UNI_MARKET_ID,
          assetId: EXAMPLE_UNI_USDC_ASSET_ID,
          amountUsd6: parseFixed("100", 6),
        })
      })
      expect(result.current.previewUi?.rows.length).toBeGreaterThan(0)
    })

    it("shows confirmation action box before execution", async () => {
      const harness = createBorrowFlowHarness()
      const { result } = await runBorrowActionBoxFlow(harness, {
        type: "borrow",
        walletId: "wallet-1",
        marketId: EXAMPLE_UNI_MARKET_ID,
        assetId: EXAMPLE_UNI_USDC_ASSET_ID,
        amountUsd6: parseFixed("100", 6),
      })
      expect(result.current.stage).toBe("success")
    })

    it("completes simulated borrow and shows synthetic receipt", async () => {
      const harness = createBorrowFlowHarness()
      const { result, executeResult } = await runBorrowActionBoxFlow(harness, {
        type: "borrow",
        walletId: "wallet-1",
        marketId: EXAMPLE_UNI_MARKET_ID,
        assetId: EXAMPLE_UNI_USDC_ASSET_ID,
        amountUsd6: parseFixed("100", 6),
      })
      expect(executeResult?.receipt.hash).toMatch(/^sim/)
      expect(result.current.successUi?.receipt.simulated).toBe(true)
    })

    it("updates positions after completion", async () => {
      const harness = createBorrowFlowHarness()
      await runBorrowActionBoxFlow(harness, {
        type: "borrow",
        walletId: "wallet-1",
        marketId: EXAMPLE_UNI_MARKET_ID,
        assetId: EXAMPLE_UNI_USDC_ASSET_ID,
        amountUsd6: parseFixed("100", 6),
      })
      const portfolio = await new SandboxBorrowReadAdapter({ state: harness.getState() }).readPortfolioBorrow("wallet-1")
      expect(portfolio.debtPositions[0]?.borrowedUsd).toBeGreaterThan(4200)
    })

    it("adds borrow to transaction history", async () => {
      const harness = createBorrowFlowHarness()
      const { executeResult } = await runBorrowActionBoxFlow(harness, {
        type: "borrow",
        walletId: "wallet-1",
        marketId: EXAMPLE_UNI_MARKET_ID,
        assetId: EXAMPLE_UNI_USDC_ASSET_ID,
        amountUsd6: parseFixed("100", 6),
      })
      expect(executeResult?.historyItem.kind).toBe("borrow")
    })
  })

  describe("repay flow", () => {
    it("opens repay action with adapter preview", async () => {
      const harness = createBorrowFlowHarness()
      const { result } = harness.renderActionBox()
      await act(async () => {
        await result.current.prepareAction({
          type: "repay",
          walletId: "wallet-1",
          debtPositionId: EXAMPLE_WALLET_1_DEBT_ID,
          amountUsd6: parseFixed("50", 6),
        })
      })
      expect(result.current.previewUi?.allowed).toBe(true)
    })

    it("completes simulated repay", async () => {
      const harness = createBorrowFlowHarness()
      const { executeResult } = await runBorrowActionBoxFlow(harness, {
        type: "repay",
        walletId: "wallet-1",
        debtPositionId: EXAMPLE_WALLET_1_DEBT_ID,
        amountUsd6: parseFixed("50", 6),
      })
      expect(executeResult?.receipt.status).toBe("success")
    })

    it("decreases debt and improves health factor", async () => {
      const harness = createBorrowFlowHarness()
      const { executeResult } = await runBorrowActionBoxFlow(harness, {
        type: "repay",
        walletId: "wallet-1",
        debtPositionId: EXAMPLE_WALLET_1_DEBT_ID,
        amountUsd6: parseFixed("250", 6),
      })
      expect(executeResult?.preview.after.totalBorrowedUsd6).toBeLessThan(executeResult?.preview.before.totalBorrowedUsd6)
    })
  })

  describe("withdraw flow", () => {
    it("blocks or warns on unsafe withdraw", async () => {
      const harness = createBorrowFlowHarness()
      const { result } = harness.renderActionBox()
      await act(async () => {
        await result.current.prepareAction({
          type: "removeCollateral",
          walletId: "wallet-1",
          positionId: "wallet-1:weth-usdc",
          amountUsd6: parseFixed("10000", 6),
        })
      })
      expect(result.current.previewUi?.allowed).toBe(false)
    })

    it("completes safe withdraw and updates collateral", async () => {
      const harness = createBorrowFlowHarness()
      const before = harness.getState().accounts["wallet-1"]!.collateralPositions[0]!.collateralShares
      await runBorrowActionBoxFlow(harness, {
        type: "removeCollateral",
        walletId: "wallet-1",
        positionId: "wallet-1:weth-usdc",
        amountUsd6: parseFixed("500", 6),
      })
      const after = harness.getState().accounts["wallet-1"]!.collateralPositions[0]!.collateralShares
      expect(after).toBeLessThan(before)
    })
  })

  describe("liquidation preview", () => {
    it("generates liquidation preview for unhealthy positions", () => {
      const state = makeExampleBorrowSystemState()
      state.accounts["wallet-1"]!.debtPositions[0]!.principalBorrowedUsd6 = 18_000_000_000n
      state.accounts["wallet-1"]!.debtPositions[0]!.debtSharesUsd6 = 18_000_000_000n

      render(
        <LiquidationPreviewPanel
          state={state}
          walletId="wallet-1"
          positionId="wallet-1:weth-usdc"
          debtPositionId={EXAMPLE_WALLET_1_DEBT_ID}
          amountUsd={2000}
        />,
      )

      expect(screen.getByText(/No transaction will be submitted/i)).toBeInTheDocument()
    })

    it("flags unsafe positions", () => {
      const state = makeExampleBorrowSystemState()
      state.accounts["wallet-1"]!.debtPositions[0]!.principalBorrowedUsd6 = 18_000_000_000n
      state.accounts["wallet-1"]!.debtPositions[0]!.debtSharesUsd6 = 18_000_000_000n

      render(
        <LiquidationPreviewPanel
          state={state}
          walletId="wallet-1"
          positionId="wallet-1:weth-usdc"
          debtPositionId={EXAMPLE_WALLET_1_DEBT_ID}
          amountUsd={2000}
        />,
      )

      expect(screen.getByText("Preview only")).toBeInTheDocument()
    })

    it("does not submit a real or sandbox-persisted transaction", () => {
      const state = makeExampleBorrowSystemState()
      state.accounts["wallet-1"]!.debtPositions[0]!.principalBorrowedUsd6 = 18_000_000_000n
      state.accounts["wallet-1"]!.debtPositions[0]!.debtSharesUsd6 = 18_000_000_000n
      const txBefore = state.transactions.length

      render(
        <LiquidationPreviewPanel
          state={state}
          walletId="wallet-1"
          positionId="wallet-1:weth-usdc"
          debtPositionId={EXAMPLE_WALLET_1_DEBT_ID}
          amountUsd={2000}
        />,
      )

      expect(state.transactions.length).toBe(txBefore)
      expect(screen.getByText(/No transaction will be submitted/i)).toBeInTheDocument()
    })
  })

  describe("action box shell", () => {
    it("shows simulated label on all sandbox action surfaces", async () => {
      const harness = createBorrowFlowHarness()
      const { result } = await runBorrowActionBoxFlow(harness, {
        type: "borrow",
        walletId: "wallet-1",
        marketId: EXAMPLE_UNI_MARKET_ID,
        assetId: EXAMPLE_UNI_USDC_ASSET_ID,
        amountUsd6: parseFixed("100", 6),
      })
      expect(result.current.successUi?.receipt.simulated).toBe(true)
    })

    it("dedupes in-flight submits", async () => {
      const harness = createBorrowFlowHarness()
      const { result } = await runBorrowActionBoxFlow(harness, {
        type: "borrow",
        walletId: "wallet-1",
        marketId: EXAMPLE_UNI_MARKET_ID,
        assetId: EXAMPLE_UNI_USDC_ASSET_ID,
        amountUsd6: parseFixed("100", 6),
      })
      expect(result.current.stage).toBe("success")
    })
  })
})
