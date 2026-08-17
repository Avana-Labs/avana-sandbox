import { readdirSync, readFileSync, statSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

/**
 * Code-derived translation-key extractor (backbone for the key-parity test).
 *
 * The app localizes through `const { t } = useTranslation()` and calls
 * `t("<English source string>")`. This module scans the source tree for those
 * calls and returns the set of STRING-LITERAL keys, plus a count of purely
 * dynamic `t(variable)` calls that carry no literal (which the parity test can
 * not assert on and therefore excludes).
 *
 * Design notes:
 *  - We only ever collect string literals that appear INSIDE a `t(...)` argument
 *    span, so comments / unrelated strings elsewhere in a file can never leak in.
 *  - The scan is a small string-and-comment-aware tokenizer (not a regex) so that
 *    parentheses and quotes inside key strings (e.g. `t("Amount (net)")`) and
 *    ternary / nullish arguments (e.g. `t(cond ? "Yes" : "No")`,
 *    `t(label ?? "Balance")`) are handled correctly. Every literal inside the
 *    argument list is captured; a call with no literal at all counts as dynamic.
 *  - `t` is matched only as a standalone identifier immediately followed by `(`,
 *    so `format(`, `getT(`, `.filter(` etc. are never mistaken for a call.
 */

const IDENT = /[A-Za-z0-9_$]/

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..")

/** Directories (relative to repo root) scanned for `t("…")` call sites. */
export const SCAN_ROOTS = ["app", "components"] as const

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "__tests__"])

function isExcludedFile(name: string): boolean {
  if (!/\.(ts|tsx)$/.test(name)) return true
  return /\.(test|spec|mock|stories)\.(ts|tsx)$/.test(name)
}

function collectSourceFiles(dir: string, out: string[]): void {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const entry of entries) {
    const full = path.join(dir, entry)
    let stat
    try {
      stat = statSync(full)
    } catch {
      continue
    }
    if (stat.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue
      collectSourceFiles(full, out)
    } else if (!isExcludedFile(entry)) {
      out.push(full)
    }
  }
}

export function listSourceFiles(): string[] {
  const files: string[] = []
  for (const root of SCAN_ROOTS) {
    collectSourceFiles(path.join(REPO_ROOT, root), files)
  }
  return files.sort()
}

export type ExtractionResult = {
  /** Every distinct string-literal key passed to a `t(...)` call, sorted. */
  keys: string[]
  /** Count of `t(...)` calls whose argument contained no string literal (dynamic). */
  dynamicCallCount: number
}

/**
 * Extract the literal `t(...)` keys and the dynamic-call count from one source string.
 * Exported for unit-testing the extractor itself.
 */
export function extractFromSource(source: string): { keys: Set<string>; dynamicCallCount: number } {
  const keys = new Set<string>()
  let dynamicCallCount = 0
  const len = source.length
  let i = 0

  // Skip over a string literal starting at `start` (source[start] is the quote).
  // Returns { end, value } where end is the index just past the closing quote.
  function readString(start: number): { end: number; value: string } {
    const quote = source[start]
    let j = start + 1
    let value = ""
    while (j < len) {
      const ch = source[j]
      if (ch === "\\") {
        // Preserve the escaped character verbatim (keys never rely on decoding,
        // and JS source keys here contain no escape sequences in practice).
        value += source[j + 1] ?? ""
        j += 2
        continue
      }
      if (ch === quote) {
        j += 1
        break
      }
      // Template-literal interpolation makes the argument dynamic; bail on it by
      // treating the whole template as non-literal (handled by the caller).
      value += ch
      j += 1
    }
    return { end: j, value }
  }

  // Scan a `t(...)` argument span beginning at `open` (source[open] === "(").
  // Collects string literals into `keys`; returns end index (past matching ")").
  function scanCallArgs(open: number): number {
    let depth = 0
    let j = open
    let sawLiteral = false
    let sawTemplateInterpolation = false
    while (j < len) {
      const ch = source[j]
      if (ch === "(") {
        depth += 1
        j += 1
        continue
      }
      if (ch === ")") {
        depth -= 1
        j += 1
        if (depth === 0) break
        continue
      }
      if (ch === "/" && source[j + 1] === "/") {
        j = source.indexOf("\n", j)
        if (j === -1) j = len
        continue
      }
      if (ch === "/" && source[j + 1] === "*") {
        const close = source.indexOf("*/", j + 2)
        j = close === -1 ? len : close + 2
        continue
      }
      if (ch === '"' || ch === "'") {
        const { end, value } = readString(j)
        keys.add(value)
        sawLiteral = true
        j = end
        continue
      }
      if (ch === "`") {
        // Template literal: only a plain (non-interpolated) template is a usable
        // key; anything with `${…}` is dynamic.
        const hasInterp = /\$\{/.test(source.slice(j + 1, source.indexOf("`", j + 1) + 1))
        const { end, value } = readTemplate(j)
        if (hasInterp) {
          sawTemplateInterpolation = true
        } else {
          keys.add(value)
          sawLiteral = true
        }
        j = end
        continue
      }
      j += 1
    }
    if (!sawLiteral || sawTemplateInterpolation) {
      // A call is "dynamic" when it carries no literal at all. (A call that mixes
      // a literal with a dynamic branch still contributes its literal above.)
      if (!sawLiteral) dynamicCallCount += 1
    }
    return j
  }

  function readTemplate(start: number): { end: number; value: string } {
    let j = start + 1
    let value = ""
    while (j < len) {
      const ch = source[j]
      if (ch === "\\") {
        value += source[j + 1] ?? ""
        j += 2
        continue
      }
      if (ch === "`") {
        j += 1
        break
      }
      value += ch
      j += 1
    }
    return { end: j, value }
  }

  while (i < len) {
    const ch = source[i]

    // Skip comments at the top level so a `t(` mentioned in prose is ignored.
    if (ch === "/" && source[i + 1] === "/") {
      i = source.indexOf("\n", i)
      if (i === -1) break
      continue
    }
    if (ch === "/" && source[i + 1] === "*") {
      const close = source.indexOf("*/", i + 2)
      i = close === -1 ? len : close + 2
      continue
    }
    // Skip string / template literals at the top level.
    if (ch === '"' || ch === "'") {
      i = readString(i).end
      continue
    }
    if (ch === "`") {
      i = readTemplate(i).end
      continue
    }

    // Identifier run: capture it, then decide if it is a standalone `t` call.
    if (IDENT.test(ch)) {
      let k = i
      while (k < len && IDENT.test(source[k])) k += 1
      const ident = source.slice(i, k)
      // Look past whitespace for a `(`.
      let m = k
      while (m < len && /\s/.test(source[m])) m += 1
      if (ident === "t" && source[m] === "(") {
        i = scanCallArgs(m)
        continue
      }
      i = k
      continue
    }

    i += 1
  }

  return { keys, dynamicCallCount }
}

/** Scan the whole source tree and return the aggregated literal keys + dynamic count. */
export function extractTranslationKeys(): ExtractionResult {
  const keys = new Set<string>()
  let dynamicCallCount = 0
  for (const file of listSourceFiles()) {
    const source = readFileSync(file, "utf8")
    const result = extractFromSource(source)
    for (const key of result.keys) keys.add(key)
    dynamicCallCount += result.dynamicCallCount
  }
  return { keys: [...keys].sort(), dynamicCallCount }
}
