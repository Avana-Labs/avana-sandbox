import { BorrowPageClient } from "./borrow-page-client"
import { fetchBorrowPage } from "@/app/lib/data/providers/borrow"

export default async function BorrowPage() {
  const pageData = await fetchBorrowPage()

  return <BorrowPageClient pageData={pageData} />
}
