import type { Metadata } from "next"
import { LendClient } from "./lend-client"

export const metadata: Metadata = {
  title: "Lend",
  description: "Supply assets to the protocol and earn yield.",
}

export default function LendPage() {
  return <LendClient />
}
