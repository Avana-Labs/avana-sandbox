import type { Metadata } from "next"

type SeoMetadataInput = {
  title: string
  description: string
  path: string
  keywords?: string[]
}

export function buildSeoMetadata({ title, description, path, keywords }: SeoMetadataInput): Metadata {
  const url = `https://avana.cc${path}`

  return {
    title,
    description,
    keywords,
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
