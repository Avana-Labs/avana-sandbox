import { headers } from "next/headers"

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

/**
 * Escape the characters that could break out of the `<script>` element when a
 * JSON-LD payload is injected via `dangerouslySetInnerHTML`. `<`, `>` and `&`
 * are rewritten to their `\uXXXX` escapes — still valid JSON, but inert as HTML,
 * so a string value like `</script>` cannot close the tag or inject markup.
 */
function escapeJsonLd(json: string): string {
  return json.replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026")
}

export async function SchemaMarkup({ data }: { data: JsonValue | JsonValue[] }) {
  // Carry the per-request CSP nonce so this inline JSON-LD script runs under the nonce policy
  // (production drops script-src 'unsafe-inline').
  const nonce = (await headers()).get("x-nonce") ?? undefined
  return (
    <script
      nonce={nonce}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: escapeJsonLd(JSON.stringify(data)) }}
    />
  )
}

export function buildWebPageSchema(input: { name: string; description: string; url: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.name,
    description: input.description,
    url: input.url,
    isPartOf: {
      "@type": "WebSite",
      name: "Avana",
      url: "https://avana.cc",
    },
  }
}

export function buildBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function buildWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Avana",
    url: "https://avana.cc",
    description: "Borrow against LP positions, lend, and multiply liquidity on Avana.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://avana.cc/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  }
}

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Avana",
    url: "https://avana.cc",
    logo: "https://avana.cc/Avana Favicon.png",
    sameAs: ["https://x.com/avana", "https://github.com/Avana-Labs"],
  }
}

export function buildFaqSchema(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  }
}
