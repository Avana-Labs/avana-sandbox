import { BorrowPageClient } from "./borrow-page-client"
import { fetchBorrowPage } from "@/app/lib/data/providers/borrow"

export const dynamic = "force-dynamic"

export default async function BorrowPage() {
  const pageData = await fetchBorrowPage()

  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-[1152px]">
          <BorrowPageClient pageData={pageData} />
        </div>
      </main>
    </div>
  )
}
