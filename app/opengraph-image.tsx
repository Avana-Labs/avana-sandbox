import { ImageResponse } from "next/og"

// Branded share card used for og:image + (via summary_large_image) the X/Twitter card.
// Served from the app's own origin so the share preview works on any deploy domain.
// Runs on the default Node.js runtime so the card is statically generated at build
// time — pinning the edge runtime would disable static generation for this route.
export const alt = "Avana — a new Aave v4 lending market built for AMM markets"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const BRAND = "#01AACF"
const INK = "#0B0D12"
const PAPER = "#EEF0F4"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: PAPER,
          color: INK,
          fontFamily: "sans-serif",
        }}
      >
        {/* brand mark */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 22,
              background: BRAND,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 56,
              fontWeight: 800,
            }}
          >
            A
          </div>
          <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: "-0.04em" }}>avana</div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.03em", maxWidth: 960 }}>
            A new Aave v4 lending market built for AMM markets.
          </div>
          <div style={{ fontSize: 34, color: "#566", fontWeight: 500, maxWidth: 920 }}>
            Borrow against AMM LP positions, lend, and loop — all risk-free in the sandbox.
          </div>
        </div>

        {/* footer pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {["Borrow", "Lend", "Multiply"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 30px",
                borderRadius: 999,
                background: "#fff",
                fontSize: 30,
                fontWeight: 600,
                color: INK,
              }}
            >
              {label}
            </div>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 30, fontWeight: 600, color: BRAND }}>app.avana.cc</div>
        </div>
      </div>
    ),
    { ...size },
  )
}
