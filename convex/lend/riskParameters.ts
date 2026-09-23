/** Lend product — Risk Parameters. Table: `lendRiskParameters`. */

import { defineRiskParametersModule } from "../silo/riskParameters"

export const { getRiskParameters, upsertRiskParameters } = defineRiskParametersModule("lendRiskParameters")
