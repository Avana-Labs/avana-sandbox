import {
  createDataSourceAdapter,
  createUnsupportedSourceError,
  type DataSourceAdapter,
  type DataSourceRequestContext,
  type DataSourceResponse,
} from "@/app/lib/data/core/source-runtime"
import type { LendReadAdapter } from "@/app/lib/lend-system/contracts"
import { buildMockLendSystemState } from "@/app/lib/lend-system/mock"
import { ProductionLendReadAdapter } from "@/app/lib/lend-system/production-read-adapter"
import { SandboxLendReadAdapter } from "@/app/lib/lend-system/sandbox-read-adapter"
import type { LendPageData } from "./types"

export type LendPageSource = {
  adapter: DataSourceAdapter
  getLendPageData(context?: DataSourceRequestContext): Promise<DataSourceResponse<LendPageData>>
}

export const mockLendPageAdapter = createDataSourceAdapter({
  id: "lend-mock",
  label: "Lend page mock source",
  mode: "mock",
})

export const liveLendPageAdapter = createDataSourceAdapter({
  id: "lend-live",
  label: "Lend page live source",
  mode: "live",
})

function isNotImplementedError(error: unknown) {
  return error instanceof Error && error.message.includes("not implemented")
}

function createLendPageSource({
  adapter,
  walletId = "demo-wallet",
  readAdapter,
}: {
  adapter: DataSourceAdapter
  walletId?: string
  readAdapter: LendReadAdapter
}): LendPageSource {
  return {
    adapter,
    async getLendPageData() {
      try {
        const data = await readAdapter.readLendPage(walletId)
        return {
          fetchedAt: new Date().toISOString(),
          data,
        }
      } catch (error) {
        if (adapter.mode === "live" && isNotImplementedError(error)) {
          throw createUnsupportedSourceError(adapter, "getLendPageData")
        }
        throw error
      }
    },
  }
}

export const mockLendPageSource: LendPageSource = createLendPageSource({
  adapter: mockLendPageAdapter,
  readAdapter: new SandboxLendReadAdapter({
    state: buildMockLendSystemState("demo-wallet"),
  }),
})

export const liveLendPageSource: LendPageSource = createLendPageSource({
  adapter: liveLendPageAdapter,
  readAdapter: new ProductionLendReadAdapter(),
})

export { createLendPageSource }
