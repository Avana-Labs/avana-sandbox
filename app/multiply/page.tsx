import type { Metadata } from "next"
import { MultiplyClient } from "./multiply-client"
import { fetchMultiplyPage } from "@/app/lib/data/providers/multiply"

export const metadata: Metadata = {
  title: "Multiply | Avana",
  description: "Multiply LP-backed positions.",
}

export default async function MultiplyPage() {
  const pageData = await fetchMultiplyPage()

  return <MultiplyClient pageData={pageData} />
}
