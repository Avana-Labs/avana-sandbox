import { getTokenIconMeta } from "@/app/lib/token-icons"

export type ThemeMode = "light" | "dark"
export type ChartTone = "neutral" | "positive" | "negative"

type ResolveChartAccentArgs = {
  theme: ThemeMode
  tone?: ChartTone
  accentClassName?: string | string[]
  symbols?: string[]
}

export function resolveChartAccent({
  theme,
  tone = "neutral",
  accentClassName,
  symbols = [],
}: ResolveChartAccentArgs) {
  const classNames = [
    ...(Array.isArray(accentClassName) ? accentClassName : accentClassName ? [accentClassName] : []),
    ...symbols.map((symbol) => getTokenIconMeta(symbol).textClass),
  ]

  const classAccent = blendHexColors(
    classNames
      .map((name) => resolveTailwindTextColor(name, theme))
      .filter((value): value is string => Boolean(value)),
  )
  if (classAccent) return classAccent

  if (tone === "positive") return theme === "dark" ? "#34d399" : "#059669"
  if (tone === "negative") return theme === "dark" ? "#fb7185" : "#e11d48"
  return theme === "dark" ? "#60a5fa" : "#2563eb"
}

export function makeChartPalette(args: ResolveChartAccentArgs) {
  const accent = resolveChartAccent(args)
  const alpha = args.theme === "dark" ? 0.3 : 0.22

  return {
    accent,
    stroke: toRgba(accent, args.theme === "dark" ? 0.78 : 0.58),
    fillTop: toRgba(accent, alpha),
    fillBottom: toRgba(accent, 0),
    cursor: toRgba(accent, args.theme === "dark" ? 0.32 : 0.22),
  }
}

export function toRgba(hex: string, alpha: number) {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

function resolveTailwindTextColor(className: string, theme: ThemeMode) {
  const token = className
    .split(/\s+/)
    .map((part) => part.trim())
    .map((part) => part.split(":").at(-1) ?? part)
    .find((part) => /^text-[a-z]+-\d{3}$/.test(part))
  if (!token) return null

  const match = /^text-([a-z]+)-(\d{3})$/.exec(token)
  if (!match) return null

  const [, family, rawShade] = match
  const palette = TAILWIND_HEX[family]
  if (!palette) return null

  const shade = Number(rawShade)
  const targetShade = theme === "dark" ? (shade >= 600 ? 400 : 300) : Math.min(600, Math.max(500, shade))
  return palette[targetShade] ?? palette[500] ?? null
}

function blendHexColors(colors: string[]) {
  if (colors.length === 0) return null
  if (colors.length === 1) return colors[0]

  const rgb = colors
    .map(hexToRgb)
    .filter((value): value is { r: number; g: number; b: number } => Boolean(value))
  if (rgb.length === 0) return null

  const total = rgb.reduce(
    (acc, value) => ({
      r: acc.r + value.r,
      g: acc.g + value.g,
      b: acc.b + value.b,
    }),
    { r: 0, g: 0, b: 0 },
  )

  return rgbToHex(
    Math.round(total.r / rgb.length),
    Math.round(total.g / rgb.length),
    Math.round(total.b / rgb.length),
  )
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "")
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`
}

const TAILWIND_HEX: Record<string, Partial<Record<300 | 400 | 500 | 600 | 700, string>>> = {
  amber: { 300: "#fcd34d", 400: "#fbbf24", 500: "#f59e0b", 600: "#d97706", 700: "#b45309" },
  blue: { 300: "#93c5fd", 400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8" },
  emerald: { 300: "#6ee7b7", 400: "#34d399", 500: "#10b981", 600: "#059669", 700: "#047857" },
  indigo: { 300: "#a5b4fc", 400: "#818cf8", 500: "#6366f1", 600: "#4f46e5", 700: "#4338ca" },
  orange: { 300: "#fdba74", 400: "#fb923c", 500: "#f97316", 600: "#ea580c", 700: "#c2410c" },
  pink: { 300: "#f9a8d4", 400: "#f472b6", 500: "#ec4899", 600: "#db2777", 700: "#be185d" },
  rose: { 300: "#fda4af", 400: "#fb7185", 500: "#f43f5e", 600: "#e11d48", 700: "#be123c" },
  sky: { 300: "#7dd3fc", 400: "#38bdf8", 500: "#0ea5e9", 600: "#0284c7", 700: "#0369a1" },
  teal: { 300: "#5eead4", 400: "#2dd4bf", 500: "#14b8a6", 600: "#0d9488", 700: "#0f766e" },
  violet: { 300: "#c4b5fd", 400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed", 700: "#6d28d9" },
  yellow: { 300: "#fde047", 400: "#facc15", 500: "#eab308", 600: "#ca8a04", 700: "#a16207" },
  zinc: { 300: "#d4d4d8", 400: "#a1a1aa", 500: "#71717a", 600: "#52525b", 700: "#3f3f46" },
}
