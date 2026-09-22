/** Borrow product — market identity (pool + asset). Table: `borrowMarkets`. */

import { defineMarketsModule } from "../silo/markets"

export const { getMarket, upsertMarkets } = defineMarketsModule("borrowMarkets", {
  withKind: true,
  identity: (row) => ({ kind: row.kind, scope: row.kind }),
})
