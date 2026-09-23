/**
 * Canonical desktop table geometry and typography — matches lend discovery tables.
 * Callers add horizontal padding (px-4 / pl-6 / pr-5) and `text-right` for numeric columns.
 */
export const TABLE_BASE = "text-[12px]"

export const TABLE_HEADER_CELL =
  "bg-table-header pb-2 pt-2.5 text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58"

/** Canonical 33px desktop header strip and 72px populated row geometry. */
export const TABLE_HEADER_ROW =
  "h-[33px] bg-table-header text-left text-muted-foreground [&>th]:pb-2 [&>th]:pt-2.5 [&>th]:text-[11px] [&>th]:font-normal [&>th]:!uppercase [&>th]:tracking-[0.08em] [&>th]:text-muted-foreground [&>th:first-child]:pl-6 [&>th:last-child]:pr-5 dark:[&>th]:text-white/58"

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
 * Column kinds shared by every desktop table, with the minimum width (px, padding included)
 * each one needs to show its content without truncating. One kind = one width everywhere, so
 * an APY column on Lend is as wide as the APY column on Multiply.
 */
export const TABLE_COLUMN_MIN_PX = {
  /** `#` row index. */
  index: 56,
  /** Asset / pool / loop identity (icon + two text lines). Pinned while the rest scrolls. */
  identity: 240,
  /** Short single value: APY, fees, LTV, leverage, premium. */
  compact: 104,
  /** Token amount over a USD sub-line. */
  metric: 136,
  /** Capacity-filled ring + percentage (header label is the long one). */
  gauge: 164,
  /** One action button. */
  action: 148,
  /** Two action buttons side by side. */
  actions2: 236,
  /** Bare row-open arrow. */
  arrow: 72,
} as const

export type TableColumnKind = keyof typeof TABLE_COLUMN_MIN_PX

export type TableColumnLayout = {
  /** Table min-width in px — the table fits its container above this and scrolls below it. */
  minWidth: number
  /** Per-column widths as percentages, proportional to each kind's minimum. */
  widths: string[]
}

/**
 * Turns an ordered list of column kinds into a `table-fixed` layout. Each column's share is
 * its minimum over the sum of minimums, so at `minWidth` every column is exactly its minimum
 * and wider containers grow all columns evenly (spacing stays consistent across tables).
 */
export function tableColumnLayout(kinds: readonly TableColumnKind[]): TableColumnLayout {
  const mins = kinds.map((kind) => TABLE_COLUMN_MIN_PX[kind])
  const minWidth = mins.reduce((sum, value) => sum + value, 0)
  return {
    minWidth,
    widths: mins.map((value) => `${((value / minWidth) * 100).toFixed(3)}%`),
  }
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
 * Classes for a pinned cell. `afterIndex` offsets the identity column past a pinned `#`
 * column (scrolling only happens at `minWidth`, where the index column is exactly its
 * minimum); `edge` draws the divider the scrolled columns slide under.
 */
export function tableStickyCell(
  part: "header" | "body",
  { afterIndex = false, edge = false }: { afterIndex?: boolean; edge?: boolean } = {},
): string {
  return [
    part === "header" ? TABLE_STICKY_HEADER : TABLE_STICKY_BODY,
    // Literal class (Tailwind can't see interpolated names) — keep in sync with `index` above.
    afterIndex ? "left-[56px]" : "left-0",
    edge ? TABLE_STICKY_DIVIDER : "",
  ]
    .filter(Boolean)
    .join(" ")
}
