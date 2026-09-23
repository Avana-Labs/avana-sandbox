/** Borrow product — Liquidation Risk KPIs. Table: `borrowLiquidationDaily`. */

import { defineLiquidationRiskModule } from "../silo/liquidationRisk"

export const { getLiquidationRisk, upsertLiquidationDaily } = defineLiquidationRiskModule("borrowLiquidationDaily")
