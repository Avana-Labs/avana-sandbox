export function askAIHref(returnHref: string) {
  return `/ask?return=${encodeURIComponent(returnHref)}`
}

export function resolveAskAICloseHref(returnHref: string | null | undefined) {
  if (!returnHref?.startsWith("/") || returnHref.startsWith("//") || returnHref.startsWith("/ask")) return "/"
  return returnHref
}
