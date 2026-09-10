/**
 * Token registry — the SINGLE place a NEW token is declared.
 *
 * Historically a new symbol had to be added to ~5 parallel symbol-keyed maps before the seed
 * assembler could pick it up: `prices/price-fixture.ts` (baseline USD), `token-icons.ts`
 * (TOKEN_MAP colors), `local-asset-icons.ts` (icon file), plus per-product catalogs. This module
 * is a leaf (it imports nothing app-side, so there are no cycles) that those maps now spread in
 * additively — so onboarding a token is ONE entry here, not a coordinated multi-file edit.
 *
 * Existing crypto tokens are intentionally NOT migrated here; they keep their hand-written map
 * entries. The registry is for tokens added going forward (currently the tokenized-stock
 * collateral for the Aerodrome / Uniswap stock spokes).
 *
 * Keys are canonical UPPERCASE symbols (matching the canonical price store). A tokenized-stock
 * "…c" variant (Aerodrome, e.g. NVDAc) is keyed by its uppercase form (NVDAC) with a
 * `displaySymbol` that preserves the trailing lowercase c.
 */

export type TokenPriceSource =
  | "defillama" // live via the Convex DefiLlama oracle (crypto)
  | "stock" // live via the client-side stock-price route (public equities)
  | "fixture" // no live source — the baseline value is authoritative (e.g. private SpaceX)

export type TokenDef = {
  /** Canonical UPPERCASE key. */
  symbol: string
  /** User-facing ticker casing (e.g. "NVDAc"). Defaults to `symbol`. */
  displaySymbol?: string
  name: string
  /** Full public path to the icon (e.g. "/stock-Icons/nvidia.png"). */
  iconPath?: string
  bgClass?: string
  textClass?: string
  decimals?: number
  /** Deterministic baseline/seed USD price; overlaid by the live source when one exists. */
  priceUsd: number
  priceSource?: TokenPriceSource
  /** For `priceSource: "stock"`: the ticker the price API is queried with (underlying for "…c"). */
  stockId?: string
  /** Whether the token is swap-routable. Default false → metadata-only (name/price, no route). */
  swapEnabled?: boolean
}

const STOCK_BG = "bg-slate-100"
const STOCK_TEXT = "text-slate-700"

/**
 * Tokenized-stock underlyings. `c: true` also emits an Aerodrome "…c" variant (same underlying
 * price/icon/live-source). `priceSource` is "stock" for public tickers (pulled live by the
 * client-side route) and "fixture" for SpaceX, which is private and on no public price API.
 * Baseline prices are real Sept-2026 quotes from app.uniswap.org/explore/tokens?category=stocks;
 * the live route overlays them for the public names.
 */
const STOCK_UNDERLYINGS: Array<{
  sym: string
  name: string
  icon: string
  price: number
  source: TokenPriceSource
  c: boolean
}> = [
  { sym: "NVDA", name: "NVIDIA", icon: "nvidia", price: 222.86, source: "stock", c: true },
  { sym: "AAPL", name: "Apple", icon: "apple", price: 318.56, source: "stock", c: true },
  { sym: "GOOGL", name: "Alphabet", icon: "google", price: 332.12, source: "stock", c: true },
  { sym: "META", name: "Meta Platforms", icon: "meta", price: 663.77, source: "stock", c: true },
  { sym: "AMZN", name: "Amazon", icon: "amazon", price: 257.0, source: "stock", c: true },
  { sym: "MSFT", name: "Microsoft", icon: "microsoft", price: 494.0, source: "stock", c: true },
  { sym: "TSLA", name: "Tesla", icon: "tesla", price: 365.11, source: "stock", c: true },
  // SpaceX is private — no public price API carries it, so the fixture value is authoritative.
  { sym: "SPCX", name: "SpaceX", icon: "spacex", price: 146.7, source: "fixture", c: true },
  { sym: "AMC", name: "AMC Entertainment", icon: "amc", price: 2.56, source: "stock", c: false },
  { sym: "MU", name: "Micron Technology", icon: "micron", price: 1027.77, source: "stock", c: false },
]

function stockEntry(sym: string, name: string, icon: string, price: number, source: TokenPriceSource): TokenDef {
  return {
    symbol: sym,
    name,
    iconPath: `/stock-Icons/${icon}.png`,
    bgClass: STOCK_BG,
    textClass: STOCK_TEXT,
    decimals: 18,
    priceUsd: price,
    priceSource: source,
    stockId: source === "stock" ? sym : undefined,
    swapEnabled: false,
  }
}

function buildRegistry(): Record<string, TokenDef> {
  const out: Record<string, TokenDef> = {}
  for (const s of STOCK_UNDERLYINGS) {
    out[s.sym] = stockEntry(s.sym, s.name, s.icon, s.price, s.source)
    if (s.c) {
      // Aerodrome tokenized variant, e.g. NVDA -> key "NVDAC", display "NVDAc". Same underlying.
      out[`${s.sym}C`] = {
        ...stockEntry(s.sym, s.name, s.icon, s.price, s.source),
        symbol: `${s.sym}C`,
        displaySymbol: `${s.sym}c`,
      }
    }
  }
  return out
}

export const TOKEN_REGISTRY: Record<string, TokenDef> = buildRegistry()

export function getRegistryToken(symbol: string): TokenDef | undefined {
  if (!symbol) return undefined
  return TOKEN_REGISTRY[symbol.trim().toUpperCase()]
}

export function allRegistryTokens(): readonly TokenDef[] {
  return Object.values(TOKEN_REGISTRY)
}

/** Full public icon path for a registered symbol, or undefined. */
export function registryIconPath(symbol: string): string | undefined {
  return getRegistryToken(symbol)?.iconPath
}

/** User-facing ticker casing for a registered symbol (e.g. "NVDAc"), or undefined. */
export function registryDisplaySymbol(symbol: string): string | undefined {
  const token = getRegistryToken(symbol)
  if (!token) return undefined
  return token.displaySymbol ?? token.symbol
}

/** Baseline USD prices (UPPERCASE symbol → price) spread into PRICE_FIXTURE. */
export function registryBaselinePrices(): Record<string, number> {
  const out: Record<string, number> = {}
  for (const token of Object.values(TOKEN_REGISTRY)) out[token.symbol] = token.priceUsd
  return out
}

/**
 * Symbols the client-side stock-price route should quote (UPPERCASE symbol → API ticker).
 * Excludes fixture-only names (e.g. SPCX). A "…c" variant maps to its underlying ticker.
 */
export function registryStockPriceIds(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const token of Object.values(TOKEN_REGISTRY)) {
    if (token.priceSource === "stock" && token.stockId) out[token.symbol] = token.stockId
  }
  return out
}
