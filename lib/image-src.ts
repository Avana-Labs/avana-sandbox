/** Returns the first non-empty image source, or null when none are usable. */
export function resolveImageSrc(...candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    if (candidate && candidate.trim().length > 0) {
      return candidate
    }
  }
  return null
}

export function hasImageSrc(src: string | null | undefined): src is string {
  return Boolean(src && src.trim().length > 0)
}
