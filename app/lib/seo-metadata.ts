import type { Metadata } from "next"
import { SITE_URL } from "./site-url"

type SeoMetadataInput = {
  title: string
  description: string
  path: string
  keywords?: string[]
  // Opt a route back into indexing. The root layout defaults every app route to noindex (the wallet
  // gate serves crawlers the onboarding shell, and the marketing host owns brand SEO); only the
  // routes with genuinely public content (/, /ask) pass index: true.
  index?: boolean
}

export function buildSeoMetadata({ title, description, path, keywords, index }: SeoMetadataInput): Metadata {
  const url = `${SITE_URL}${path}`

  return {
    title,
    description,
    keywords,
    ...(index ? { robots: { index: true, follow: true } } : {}),
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "Avana",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}
