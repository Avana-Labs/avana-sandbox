/** Multiply product — Risk Parameters. Table: `multiplyRiskParameters`. */

import { defineRiskParametersModule } from "../silo/riskParameters"

export const { getRiskParameters, upsertRiskParameters } = defineRiskParametersModule("multiplyRiskParameters")
