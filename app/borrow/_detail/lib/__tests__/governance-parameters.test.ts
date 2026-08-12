import { describe, expect, it } from "vitest"
import {
  RISK_PARAMETER_LABELS,
  normalizeGovernanceParameters,
  withGovernanceParameterView,
} from "../governance-parameters"

describe("risk parameter normalization", () => {
  it("rewrites the IRM five-pack into eight filled risk parameters", () => {
    const about = withGovernanceParameterView(
      {
        description: "x",
        stats: [],
        history: [{ date: "2025-01-01", title: "Listed", description: "Opened" }],
      },
      [
        { id: "collateralFactor", label: "Collateral factor", value: "63.5%" },
        { id: "optimalUtilization", label: "Optimal utilization", value: "83%" },
        { id: "slopeBelowOptimal", label: "Slope below optimal", value: "5.3%" },
        { id: "slopeAboveOptimal", label: "Slope above optimal", value: "61%" },
        { id: "baseBorrowRate", label: "Base borrow rate", value: "0.42%" },
      ],
    )

    expect(about.governanceParameters?.parameters.map((parameter) => parameter.label)).toEqual(RISK_PARAMETER_LABELS)
    expect(about.governanceParameters?.parameters.map((parameter) => parameter.value)).toEqual([
      "63.5%",
      "5.00%",
      "$25.0M",
      "5.00% - 5.55%",
      "$10.0M",
      "1.57",
      "68.50%",
      "Chainlink",
    ])
  })

  it("keeps an already-complete risk set", () => {
    const about = normalizeGovernanceParameters({
      description: "x",
      stats: [],
      history: [],
      governanceParameters: {
        parameters: [
          { id: "collateralFactor", label: "Collateral factor", value: "78.00%" },
          { id: "collateralRisk", label: "Collateral risk", value: "5.00%" },
          { id: "depositCapacity", label: "Deposit capacity", value: "$120.0M" },
          { id: "liquidationPenalty", label: "Liquidation penalty", value: "5.00% - 5.55%" },
          { id: "borrowCapacity", label: "Borrow capacity", value: "$40.0M" },
          { id: "targetHealthFactor", label: "Target health factor", value: "1.28" },
          { id: "liquidationThreshold", label: "Liquidation threshold", value: "83.00%" },
          { id: "oracle", label: "Oracle source", value: "Chainlink" },
        ],
        changelog: [],
      },
    })

    expect(about.parameters.map((parameter) => parameter.label)).toEqual(RISK_PARAMETER_LABELS)
    expect(about.parameters.map((parameter) => parameter.value)).toEqual([
      "78.00%",
      "5.00%",
      "$120.0M",
      "5.00% - 5.55%",
      "$40.0M",
      "1.28",
      "83.00%",
      "Chainlink",
    ])
  })
})
