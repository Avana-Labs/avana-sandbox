import {
  buildSparklineAreaPath,
  buildSparklineLinePath,
  buildSparklinePoints,
  getSparklineGradientId,
} from "@/app/lib/sparkline"

describe("sparkline helpers", () => {
  it("returns stable point sets for the same seed", () => {
    expect(buildSparklinePoints(12, true, "home-metric")).toEqual(buildSparklinePoints(12, true, "home-metric"))
  })

  it("creates line and area paths from the generated points", () => {
    const points = buildSparklinePoints(4, false, "negative-metric")
    const linePath = buildSparklineLinePath(points)
    const areaPath = buildSparklineAreaPath(linePath)

    expect(linePath.startsWith("M")).toBe(true)
    expect(areaPath.endsWith("L 100 100 L 0 100 Z")).toBe(true)
  })

  it("creates stable gradient identifiers", () => {
    expect(getSparklineGradientId("borrowing-power", true)).toBe(getSparklineGradientId("borrowing-power", true))
    expect(getSparklineGradientId("borrowing-power", true)).not.toBe(getSparklineGradientId("borrowing-power", false))
  })
})
