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

/** Secondary line under a primary value (symbol, venue, USD sub-line). */
export const TABLE_CELL_SECONDARY =
  "mt-0.5 text-[13px] font-normal tracking-normal text-muted-foreground md:text-[13px] dark:text-white/38"

/** Caption under a stacked metric (per day, liquidation value). */
export const TABLE_CELL_CAPTION = "mt-0.5 text-[13px] tracking-normal text-muted-foreground dark:text-white/40"

/** Inline numeric metric with tabular alignment. */
export const TABLE_CELL_NUMERIC = `${TABLE_CELL_PRIMARY} tabular-nums`

/** Mono numeric metric when font-data is intentional (LTV %, index #). */
export const TABLE_CELL_NUMERIC_DATA =
  "font-data text-[15px] font-normal tracking-normal tabular-nums text-foreground dark:text-white"

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
