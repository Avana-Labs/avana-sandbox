import type { AboutCard } from "@/app/lib/borrow-detail"

export type NewsCardItem = {
  title: string
  description?: string
  source: string
  time: string
  imageUrl?: string
  imageLabel?: string
}

export function buildNewsItems(
  about: AboutCard,
  imageUrl?: string,
  imageLabel?: string,
): NewsCardItem[] {
  const items =
    about.news ??
    about.history.slice(0, 3).map((entry, index) => ({
      title: entry.title,
      description: entry.description,
      source: index === 0 ? "Latest update" : "Protocol note",
      time: entry.date,
    }))

  return items.map((item) => ({
    ...item,
    imageUrl,
    imageLabel,
  }))
}
