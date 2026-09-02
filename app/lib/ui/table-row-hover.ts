/**
 * Canonical table header-cell strip — the lend-page design, reused across every table
 * (borrow, multiply, dashboard tabs) so the header strips are one consistent size + text
 * style app-wide. Callers add their own horizontal padding (px-4 / pl-6 / pr-5) and
 * `text-right` for numeric columns.
 */
export const TABLE_HEADER_CELL =
  "bg-table-header pb-2 pt-2.5 text-[11px] font-medium !uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58"

/** Canonical 33px desktop header strip and 72px populated row geometry. */
export const TABLE_HEADER_ROW =
  "h-[33px] bg-table-header text-left text-muted-foreground [&>th]:pb-2 [&>th]:pt-2.5 [&>th]:text-[11px] [&>th]:font-medium [&>th]:!uppercase [&>th]:tracking-[0.08em] [&>th]:text-muted-foreground [&>th:first-child]:pl-6 [&>th:last-child]:pr-5 dark:[&>th]:text-white/58"

/** Force uppercase labels — CSS alone is overridden in some sortable header buttons. */
export function formatTableHeaderLabel(label: string): string {
  return label.toLocaleUpperCase("en-US")
}

export const TABLE_BODY_ROW = "h-[72px]"

/** Shared table row hover treatment for lend, borrow, multiply, and dashboard tables. */
export const TABLE_ROW_HOVER_BG = "transition-colors group-hover:bg-hover"
// No rounded corners on the hover highlight — the row fill stays square at both
// ends (LEFT/RIGHT kept as distinct exports for the edge cells' semantics).
export const TABLE_ROW_HOVER_LEFT = TABLE_ROW_HOVER_BG
export const TABLE_ROW_HOVER_RIGHT = TABLE_ROW_HOVER_BG
