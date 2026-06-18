export type DataSourceMode = "mock" | "live"

export function resolveDataSourceMode(): DataSourceMode {
  return process.env.AVANA_DATA_SOURCE === "live" ? "live" : "mock"
}

export function unsupportedLiveSource(page: string): never {
  throw new Error(`Live data source is not implemented for ${page}. Set AVANA_DATA_SOURCE=mock or provide a live source override.`)
}
