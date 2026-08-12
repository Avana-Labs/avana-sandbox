import { describe, expect, it } from "vitest"
import { normalizeGovernanceParameters, withGovernanceParameterView } from "../governance-parameters"

const LEND_LABELS = [
  "Max LTV",
  "Liquidation threshold",
  "Supply cap",
  "Borrow cap",
  "Liquidation bonus",
  "Oracle source",
]

describe("risk parameter normalization", () => {
  it("rewrites the IRM five-pack into six filled lend parameters", () => {
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

    expect(about.governanceParameters?.parameters.map((parameter) => parameter.label)).toEqual(LEND_LABELS)
    expect(about.governanceParameters?.parameters.map((parameter) => parameter.value)).toEqual([
      "63.5%",
      "68.5%",
      "$25.0M",
      "$10.0M",
      "5%",
      "Chainlink",
    ])
  })

  it("keeps an already-complete lend set", () => {
    const about = normalizeGovernanceParameters({
      description: "x",
      stats: [],
      history: [],
      governanceParameters: {
        parameters: [
          { id: "ltv", label: "Max LTV", value: "78%" },
          { id: "liquidationThreshold", label: "Liquidation threshold", value: "83%" },
          { id: "supplyCap", label: "Supply cap", value: "$120.0M" },
          { id: "borrowCap", label: "Borrow cap", value: "$40.0M" },
          { id: "liquidationBonus", label: "Liquidation bonus", value: "5%" },
          { id: "oracle", label: "Oracle source", value: "Chainlink" },
        ],
        changelog: [],
      },
    })

    expect(about.parameters.map((parameter) => parameter.value)).toEqual([
      "78%",
      "83%",
      "$120.0M",
      "$40.0M",
      "5%",
      "Chainlink",
    ])
  })
})
