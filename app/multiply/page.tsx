import type { Metadata } from "next"
import { MultiplyClient } from "./multiply-client"

export const metadata: Metadata = {
  title: "Multiply | Avana",
  description: "Multiply LP-backed positions.",
}

export default function MultiplyPage() {
  return <MultiplyClient />
}
