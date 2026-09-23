/** Lend product — Risk Premium / assessment card. Table: `lendRiskAssessments`. */

import { defineRiskAssessmentModule } from "../silo/riskAssessment"

export const { getRisk, upsertRiskAssessments } = defineRiskAssessmentModule("lendRiskAssessments")
