import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { AVANA_EXTERNAL_LINKS } from "@/app/components/external-links"

describe("LearnSection blog links", () => {
  it("P2-06: points Learn cards at the production blog base URL", () => {
    const source = readFileSync(resolve(__dirname, "../learn-section.tsx"), "utf8")
    expect(source).toMatch(/AVANA_EXTERNAL_LINKS\.blog/)
    expect(source).not.toMatch(/avana-ashen\.vercel\.app/)
    expect(AVANA_EXTERNAL_LINKS.blog).toBe("https://avana.cc/blog")
  })
})
