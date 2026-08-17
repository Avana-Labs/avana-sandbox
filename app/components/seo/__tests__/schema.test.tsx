import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { SchemaMarkup } from "../schema"

describe("SchemaMarkup — JSON-LD escaping (P3-7)", () => {
  it("escapes </script> and other HTML-significant characters so the tag can't be broken out of", () => {
    const html = renderToStaticMarkup(
      <SchemaMarkup data={{ name: "</script><img src=x onerror=alert(1)>", note: "a & b" }} />,
    )
    // No raw sequence that a parser would treat as markup.
    expect(html).not.toContain("</script><img")
    expect(html).not.toContain("<img")
    // The value survives as escaped JSON.
    expect(html).toContain("\\u003c/script\\u003e")
    expect(html).toContain("a \\u0026 b")
  })

  it("still emits valid JSON that round-trips to the original data", () => {
    const data = { "@type": "WebPage", name: "A <b> & c > d" }
    const html = renderToStaticMarkup(<SchemaMarkup data={data} />)
    const json = html.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "")
    expect(JSON.parse(json)).toEqual(data)
  })
})
