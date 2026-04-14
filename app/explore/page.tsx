import { ExplorePageClient } from "./explore-page-client"
import { getCachedExploreSnapshot } from "@/app/lib/explore-data"

export default async function BorrowPage() {
  const snapshot = await getCachedExploreSnapshot()

  return <ExplorePageClient {...snapshot} />
}
