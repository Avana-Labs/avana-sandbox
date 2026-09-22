/** Borrow product — Interest Rate Model params. Table: `borrowInterestRateModels`. */

import { defineInterestRateModelModule } from "../silo/interestRateModel"

export const { getInterestRateModel, upsertInterestRateModels } = defineInterestRateModelModule("borrow")
