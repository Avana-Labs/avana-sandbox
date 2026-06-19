/** Decode dynamic route params for spoke asset ids (e.g. `uni-v2%3Adai` → `uni-v2:dai`). */
export function normalizeBorrowAssetRouteId(raw: string): string {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/** Canonical href for a borrowable asset detail page. */
export function borrowAssetDetailPath(assetId: string): string {
  return `/borrow/assets/${encodeURIComponent(assetId)}`
}
