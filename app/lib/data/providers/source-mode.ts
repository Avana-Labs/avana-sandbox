import type { DataSourceMode } from "@/app/lib/data/core/source-runtime"

export function resolveDataSourceMode(): DataSourceMode {
  const testMode = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE === "1"

  return testMode || process.env.AVANA_DATA_SOURCE === "mock" ? "mock" : "live"
}
