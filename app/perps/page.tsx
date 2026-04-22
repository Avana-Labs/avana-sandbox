import type { Metadata } from "next"
import { PerpsClient } from "./perps-client"

export const metadata: Metadata = {
  title: "Perps | Avana",
  description: "Trade LP-backed perps.",
}

export default function PerpsPage() {
  return <PerpsClient />
}
