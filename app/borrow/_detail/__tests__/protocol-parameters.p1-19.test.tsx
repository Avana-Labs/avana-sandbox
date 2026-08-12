import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { ProtocolParametersSection } from "@/app/borrow/_detail/pool-sections/ProtocolParametersSection"
import { buildAssetProtocolParameters } from "@/app/lib/borrow-detail/protocol-parameters"
import { resolveAsset } from "@/app/lib/borrow-detail/asset.mock"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

afterEach(cleanup)

describe("protocol parameters on borrow detail", () => {
  it("p1-19: ships IRM parameter rows with metric-help tooltips", async () => {
    const asset = resolveAsset("uni-v3-stable:usdc")
    expect(asset).not.toBeNull()

    const parameters = buildAssetProtocolParameters(asset!)
    expect(parameters.map((row) => row.label)).toEqual([
      "Optimal utilization",
      "Slope below optimal",
      "Slope above optimal",
      "Base borrow rate",
    ])

    const { userEvent } = await import("@testing-library/user-event")
    const user = userEvent.setup()
    render(<ProtocolParametersSection parameters={parameters} />)

    await user.hover(
      screen.getByRole("button", {
        name: "More information about Optimal utilization",
      }),
    )
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "The target utilisation rate where the interest rate curve inflects",
    )
  })

  it("p1-19: asset and pool detail clients fold protocol parameters into About", () => {
    const assetDetail = readFileSync(resolve(__dirname, "../../asset/[assetId]/asset-detail-client.tsx"), "utf8")
    const poolDetail = readFileSync(resolve(__dirname, "../../pool/[poolId]/pool-detail-client.tsx"), "utf8")

    expect(assetDetail).toMatch(/withGovernanceParameterView/)
    expect(poolDetail).toMatch(/withGovernanceParameterView/)
  })
})
