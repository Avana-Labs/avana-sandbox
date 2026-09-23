/** Lend product — About / FAQs / parameter-change history. Table: `lendMarketContent`. */

import { defineContentModule } from "../silo/content"

export const { getContent, upsertContent } = defineContentModule("lendMarketContent", { product: "lend" })
