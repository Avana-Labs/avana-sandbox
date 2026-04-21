import { HomePageClient } from "@/app/components/home-page-client"
import { getCachedHomeSnapshot } from "@/app/lib/home-data"

export default async function HomePage() {
  const snapshot = await getCachedHomeSnapshot()

  return <HomePageClient {...snapshot} />
}
