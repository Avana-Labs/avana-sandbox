import { describe, expect, it } from "vitest"
import { borrowAssetDetailPath, normalizeBorrowAssetRouteId } from "@/app/lib/borrow-routes"

describe("borrow asset routes", () => {
  it("decodes encoded spoke asset ids from dynamic route params", () => {
    expect(normalizeBorrowAssetRouteId("uni-v2%3Adai")).toBe("uni-v2:dai")
    expect(normalizeBorrowAssetRouteId("uni-v2:dai")).toBe("uni-v2:dai")
  })

  it("builds encoded detail paths for spoke asset ids", () => {
    expect(borrowAssetDetailPath("uni-v2:dai")).toBe("/borrow/assets/uni-v2%3Adai")
  })
})
