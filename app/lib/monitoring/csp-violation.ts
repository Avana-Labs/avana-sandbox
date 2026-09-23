type CspViolation = Pick<
  SecurityPolicyViolationEvent,
  "disposition" | "blockedURI" | "effectiveDirective" | "sourceFile" | "lineNumber" | "columnNumber"
>

export function describeBlockedEval(event: CspViolation) {
  if (
    event.disposition !== "enforce" ||
    event.blockedURI !== "eval" ||
    !["script-src", "script-src-elem"].includes(event.effectiveDirective)
  ) {
    return null
  }

  let sourceFile = "<anonymous>"
  try {
    const source = new URL(event.sourceFile)
    // Never send script bodies, data URLs, credentials, query strings or fragments.
    if (["http:", "https:", "chrome-extension:", "moz-extension:", "app:"].includes(source.protocol)) {
      sourceFile = `${source.protocol}//${source.host}${source.pathname}`
    }
  } catch {
    // Browsers may omit the source for injected scripts.
  }
  return {
    source_file: sourceFile,
    line_number: event.lineNumber,
    column_number: event.columnNumber,
    directive: event.effectiveDirective,
  }
}
