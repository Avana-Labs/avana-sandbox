import type { TranslationDictionary } from "./types"

/**
 * Look up `key` in a single already-loaded locale dictionary. Mirrors the old
 * monolithic `translate()`: exact hit wins, then two generated-copy fallbacks
 * ("{verb} successful", "{amount} processed.") compose from their parts so the
 * receipt/success sinks localize without a dedicated key per verb/amount.
 *
 * `dict` is the merged dictionary for one language (or undefined before it has
 * loaded / for English), in which case keys fall back to their English source.
 */
export function translateWith(dict: TranslationDictionary | undefined, key: string): string {
  const exact = dict?.[key]
  if (exact) return exact

  const successfulMatch = key.match(/^(.+) successful$/)
  if (successfulMatch) {
    return `${translateWith(dict, successfulMatch[1])} ${translateWith(dict, "successful")}`
  }

  if (key.endsWith(" processed.")) {
    return `${key.slice(0, -" processed.".length)} ${translateWith(dict, "processed")}.`
  }

  return key
}
