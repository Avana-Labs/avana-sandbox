/** Borrow product — Risk Premium / assessment card. Table: `borrowRiskAssessments`. */

import { defineRiskAssessmentModule } from "../silo/riskAssessment"

export const { getRisk, upsertRiskAssessments } = defineRiskAssessmentModule("borrowRiskAssessments", {
  withKind: true,
})
