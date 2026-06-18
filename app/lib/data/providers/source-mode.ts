import type { DataSourceMode } from "@/app/lib/data/core/source-runtime"

export function resolveDataSourceMode(): DataSourceMode {
  return process.env.AVANA_DATA_SOURCE === "live" ? "live" : "mock"
}
