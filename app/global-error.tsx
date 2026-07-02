"use client"

import { useEffect } from "react"

/**
 * Global error boundary — the last line of defence. It replaces the root layout
 * when the layout itself throws, so it must render its own <html>/<body> and
 * cannot rely on providers or fonts from RootLayout. Kept intentionally minimal
 * and self-contained (inline styles) so it renders even when everything else has.
 */
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "2rem",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#0b0b0f",
          color: "#f5f5f7",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>Avana</p>
        <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: 500, letterSpacing: "-0.04em" }}>
          Something went wrong
        </h1>
        <p style={{ margin: 0, maxWidth: "34rem", opacity: 0.8 }}>
          The app hit an unexpected error. Try again — if it keeps happening, please let us know.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center" }}>
          <button
            type="button"
            onClick={reset}
            style={{
              cursor: "pointer",
              border: "none",
              borderRadius: "9999px",
              padding: "0.75rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              background: "#f5f5f7",
              color: "#0b0b0f",
            }}
          >
            Try again
          </button>
          <a
            href="/dashboard"
            style={{
              borderRadius: "9999px",
              padding: "0.75rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              background: "rgba(255,255,255,0.1)",
              color: "#f5f5f7",
              textDecoration: "none",
            }}
          >
            Back to dashboard
          </a>
        </div>
      </body>
    </html>
  )
}
