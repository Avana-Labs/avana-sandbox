/**
 * Canonical desktop table geometry and typography — matches lend discovery tables.
 * Callers add horizontal padding (px-4 / pl-6 / pr-5) and `text-right` for numeric columns.
 */
export const TABLE_BASE = "text-[12px]"

export const TABLE_HEADER_CELL =
  "bg-table-header pb-2 pt-2.5 text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58"

/** Canonical 33px desktop header strip and 72px populated row geometry. */
export const TABLE_HEADER_ROW =
  "h-[33px] bg-table-header text-left text-muted-foreground [&>th]:whitespace-nowrap [&>th]:pb-2 [&>th]:pt-2.5 [&>th]:text-[11px] [&>th]:font-normal [&>th]:!uppercase [&>th]:tracking-[0.08em] [&>th]:text-muted-foreground [&>th:first-child]:pl-6 [&>th:last-child]:pr-5 dark:[&>th]:text-white/58"

/** Force uppercase labels — CSS alone is overridden in some sortable header buttons. */
export function formatTableHeaderLabel(label: string): string {
  return label.toLocaleUpperCase("en-US")
}

export const TABLE_BODY_ROW = "h-[72px]"

/** Primary body text — 15px regular, same as lend page rows. */
export const TABLE_CELL_PRIMARY =
  "text-[15px] font-normal tracking-normal text-foreground dark:text-white md:text-[15px]"

/**
 * Geometry only, for sub-lines carrying a semantic tone. Use these plus the tone class: the
 * color-bearing variants below bake in a `dark:text-white/XX` two-class selector that outranks
 * a single-class tone and would grey it out in dark mode.
 */
export const TABLE_CELL_SECONDARY_UNCOLORED = "mt-0.5 text-[13px] font-normal tracking-normal md:text-[13px]"
export const TABLE_CELL_CAPTION_UNCOLORED = "mt-0.5 text-[13px] tracking-normal"

/** Secondary line under a primary value (symbol, venue, USD sub-line). */
export const TABLE_CELL_SECONDARY = `${TABLE_CELL_SECONDARY_UNCOLORED} text-muted-foreground dark:text-white/38`

/** Caption under a stacked metric (per day, liquidation value). */
export const TABLE_CELL_CAPTION = `${TABLE_CELL_CAPTION_UNCOLORED} text-muted-foreground dark:text-white/40`

/** Inline numeric metric with tabular alignment. Keep amount + symbol on one line. */
export const TABLE_CELL_NUMERIC = `${TABLE_CELL_PRIMARY} tabular-nums whitespace-nowrap`

/** Index column (#) in numbered tables. */
export const TABLE_CELL_INDEX =
  "align-middle font-data text-[14px] font-medium tabular-nums text-muted-foreground dark:text-white/52"

/** Standard data cell padding. */
export const TABLE_CELL_PADDING = "py-3 px-4"

/** First column padding when it holds row identity. */
export const TABLE_CELL_PADDING_LEADING = "py-3 pl-6 pr-3"

/** Trailing data column padding. */
export const TABLE_CELL_PADDING_TRAILING = "py-3 px-4 pr-5"

/** Shared table row hover treatment for lend, borrow, multiply, and dashboard tables. */
export const TABLE_ROW_HOVER_BG = "transition-colors group-hover:bg-hover"
export const TABLE_ROW_HOVER_LEFT = TABLE_ROW_HOVER_BG
export const TABLE_ROW_HOVER_RIGHT = TABLE_ROW_HOVER_BG

/**
 * Column kinds shared by every desktop table, with the width (px, padding included) each one
 * needs to show its content without truncating. One kind = one width everywhere, so an APY
 * column on Lend is as wide as the APY column on Multiply.
 */
export const TABLE_COLUMN_MIN_PX = {
  /** `#` row index. */
  index: 56,
  /** Asset / pool / loop identity (icon + two text lines). Pinned while the rest scrolls. */
  identity: 264,
  /** Identity in the narrower dashboard column. Pinned like `identity`. */
  identityCompact: 248,
  /** Short single value: APY, fees, LTV, leverage, premium. */
  compact: 104,
  /** Token amount over a USD sub-line. */
  metric: 136,
  /** Value over a long sub-line (e.g. wallet value over its P/L). */
  metricWide: 176,
  /** Capacity-filled ring + percentage (header label is the long one). */
  gauge: 164,
  /** One action button. */
  action: 160,
  /** One action button in the narrower dashboard column (no "Review risk"-length labels). */
  actionCompact: 144,
  /** Two action buttons side by side. */
  actions2: 212,
  /** Bare row-open arrow. */
  arrow: 72,
} as const

export type TableColumnKind = keyof typeof TABLE_COLUMN_MIN_PX

/**
 * Kinds whose share of the table is taken from a reference width instead of the table's own
 * mix of columns. Every table on a page shares that reference, so the index, identity, and
 * action columns (and the pinned divider) land in the same place on every table; only the
 * data columns in between vary.
 */
const ANCHOR_KINDS: ReadonlySet<TableColumnKind> = new Set([
  "index",
  "identity",
  "identityCompact",
  "action",
  "actionCompact",
  "actions2",
  "arrow",
])

/** Smallest width an anchor column may shrink to before the table scrolls instead. */
const ANCHOR_FLOOR_PX: Partial<Record<TableColumnKind, number>> = {
  index: 44,
  identity: 232,
  identityCompact: 228,
  action: 144,
  actionCompact: 140,
  actions2: 204,
  arrow: 56,
}

/** Market pages' content column (`max-w-[1152px]`). */
export const MARKET_TABLE_REFERENCE_PX = 1152

/** Dashboard main column beside the activity rail at the 1152px page width. */
export const DASHBOARD_TABLE_REFERENCE_PX = 712

export type TableColumnLayout = {
  /** Table min-width in px — the table fits its container above this and scrolls below it. */
  minWidth: number
  /** Per-column `<col>` widths as percentages. */
  widths: string[]
}

/**
 * Turns an ordered list of column kinds into a `table-fixed` layout (percentages only — browsers
 * ignore `calc()` in column widths). Anchor kinds take `px / referenceWidth` of the table; data
 * columns split the rest in proportion to their minimums. `minWidth` is the narrowest width at
 * which every data column still gets its minimum and every anchor its floor.
 */
export function tableColumnLayout(
  kinds: readonly TableColumnKind[],
  { referenceWidth = MARKET_TABLE_REFERENCE_PX }: { referenceWidth?: number } = {},
): TableColumnLayout {
  const anchorShare = (kind: TableColumnKind) => TABLE_COLUMN_MIN_PX[kind] / referenceWidth
  const anchorTotal = kinds.reduce((sum, kind) => (ANCHOR_KINDS.has(kind) ? sum + anchorShare(kind) : sum), 0)
  const flexPx = kinds.reduce((sum, kind) => (ANCHOR_KINDS.has(kind) ? sum : sum + TABLE_COLUMN_MIN_PX[kind]), 0)
  const flexTotal = Math.max(0, 1 - anchorTotal)
  const shares = kinds.map((kind) =>
    ANCHOR_KINDS.has(kind) || flexPx === 0
      ? anchorShare(kind) / (flexPx === 0 ? anchorTotal : 1)
      : (flexTotal * TABLE_COLUMN_MIN_PX[kind]) / flexPx,
  )
  const minWidth = Math.ceil(
    Math.max(
      ...kinds.map((kind, index) => {
        const floor = ANCHOR_KINDS.has(kind)
          ? (ANCHOR_FLOOR_PX[kind] ?? TABLE_COLUMN_MIN_PX[kind])
          : TABLE_COLUMN_MIN_PX[kind]
        return shares[index] > 0 ? floor / shares[index] : 0
      }),
    ),
  )
  return { minWidth, widths: shares.map((share) => `${(share * 100).toFixed(3)}%`) }
}

/** Row action pill: one minimum width so Pledge / Deposit / Borrow / Multiply line up. */
export const TABLE_ACTION_BUTTON = "w-auto min-w-[108px] justify-center"

/** Table element classes for the shared layout (pair with `style={{ minWidth }}`). */
export const TABLE_FIXED = "w-full table-fixed border-separate border-spacing-0"

/**
 * Pinned identity column. The cell keeps an opaque page background so scrolled columns pass
 * underneath it; row hover is painted with an inset shadow instead of the translucent
 * `bg-hover` (which would let the scrolled content show through).
 */
const TABLE_STICKY_BODY =
  "sticky z-[1] bg-background transition-shadow group-hover:shadow-[inset_0_0_0_9999px_hsl(var(--hover-overlay))]"
const TABLE_STICKY_HEADER = "sticky z-[2] bg-table-header"
const TABLE_STICKY_DIVIDER =
  "after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border dark:after:bg-white/10"

/**
 * Classes for the pinned identity cell. It sticks at the left edge: a leading `#` column
 * scrolls away underneath it, then the data columns slide under the divider.
 */
export function tableStickyCell(part: "header" | "body"): string {
  return `${part === "header" ? TABLE_STICKY_HEADER : TABLE_STICKY_BODY} left-0 ${TABLE_STICKY_DIVIDER}`
}
