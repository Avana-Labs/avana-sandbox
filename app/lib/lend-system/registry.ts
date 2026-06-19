import { ProductionLendReadAdapter } from "./production-read-adapter"
import { ProductionLendTransactionAdapter } from "./production-transaction-adapter"
import { SandboxLendReadAdapter } from "./sandbox-read-adapter"
import { SandboxLendTransactionAdapter } from "./sandbox-transaction-adapter"

export const lendSystemRegistry = {
  sandboxReadAdapter: SandboxLendReadAdapter,
  sandboxTransactionAdapter: SandboxLendTransactionAdapter,
  productionReadAdapter: ProductionLendReadAdapter,
  productionTransactionAdapter: ProductionLendTransactionAdapter,
}
