import { BorrowPageHero } from "./borrow-page-hero"
import { BorrowWorkspaceClient } from "./borrow-workspace-client"
import { fetchBorrowPage } from "@/app/lib/data/providers/borrow"

export default async function BorrowPage() {
  const pageData = await fetchBorrowPage()

  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-[1152px] xl:max-w-5xl 2xl:max-w-[1152px]">
          <BorrowPageHero pageData={pageData} />
          <BorrowWorkspaceClient pageData={pageData} />
        </div>
      </main>
    </div>
  )
}
