import { describe, expect, it } from "vitest"
import { applyDetailContentOverlay, mergeAliasedQuickStats } from "@/app/lib/detail-page/live-detail-helpers"

describe("applyDetailContentOverlay", () => {
  const mockDetail = {
    about: {
      description: "Mock description",
      stats: [{ label: "Mock stat", value: "1" }],
      history: [{ date: "2024-01-01", title: "Mock history" }],
      governanceParameters: {
        parameters: [{ id: "collateralFactor", label: "Collateral factor", value: "75%" }],
        changelog: [{ date: "2024-01-02", parameter: "LTV", previous: "70%", current: "75%" }],
      },
    },
    faqs: [{ question: "Mock Q?", answer: "Mock A" }],
  }

  const convexContent = {
    description: "Convex description",
    stats: [{ label: "Convex stat", value: "2", href: "https://example.com" }],
    history: [{ date: "2026-01-01", title: "Convex history", description: "From seed" }],
    faqs: [{ question: "Convex Q?", answer: "Convex A" }],
  }

  it("applies Convex description, stats, history, and FAQs", () => {
    const next = applyDetailContentOverlay(mockDetail, convexContent)

    expect(next.about.description).toBe("Convex description")
    expect(next.about.stats).toEqual(convexContent.stats)
    expect(next.about.history).toEqual(convexContent.history)
    expect(next.faqs).toEqual(convexContent.faqs)
  })

  it("preserves governanceParameters from the base detail when content has none", () => {
    const next = applyDetailContentOverlay(mockDetail, convexContent)

    expect(next.about.governanceParameters).toEqual(mockDetail.about.governanceParameters)
  })

  it("returns the base detail unchanged when content is null", () => {
    expect(applyDetailContentOverlay(mockDetail, null)).toBe(mockDetail)
    expect(applyDetailContentOverlay(mockDetail, undefined)).toBe(mockDetail)
  })

  it("clears catalog About/FAQs when content is missing and clearWhenMissing is set", () => {
    const next = applyDetailContentOverlay(mockDetail, null, { clearWhenMissing: true })
    expect(next.about.description).toBe("")
    expect(next.about.stats).toEqual([])
    expect(next.about.history).toEqual([])
    expect(next.faqs).toEqual([])
    expect(next.about.governanceParameters).toEqual(mockDetail.about.governanceParameters)
  })
})

describe("mergeAliasedQuickStats", () => {
  it("overlays Convex values onto aliased mock ids", () => {
    const base = [
      { id: "totalSupplied", value: "$1" },
      { id: "utilization", value: "10%" },
      { id: "reserveFactor", value: "5%" },
    ]
    const convex = [
      { id: "supplied", value: "$9M" },
      { id: "utilization", value: "42%" },
    ]

    const next = mergeAliasedQuickStats(base, convex, {
      supplied: ["supplied", "totalSupplied"],
      utilization: ["utilization"],
    })

    expect(next).toEqual([
      { id: "totalSupplied", value: "$9M" },
      { id: "utilization", value: "42%" },
      { id: "reserveFactor", value: "5%" },
    ])
  })
})
