/** Lend product — market identity. Table: `lendMarkets`. */

import { defineMarketsModule } from "../silo/markets"

export const { getMarket, upsertMarkets } = defineMarketsModule("lendMarkets", {
  identity: () => ({ scope: "lend" as const }),
})
