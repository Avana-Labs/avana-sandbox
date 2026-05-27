export function sanitizeNumericInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "")
  const [integerPart = "", ...decimalParts] = cleaned.split(".")

  if (decimalParts.length === 0) {
    return integerPart
  }

  return `${integerPart}.${decimalParts.join("")}`
}
