import { BorrowPageClient } from "./borrow-page-client"
import { getCachedBorrowSnapshot } from "@/app/lib/borrow-data"

export default async function BorrowPage() {
  const snapshot = await getCachedBorrowSnapshot()

  return <BorrowPageClient {...snapshot} />
}
