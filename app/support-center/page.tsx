import type { Metadata } from "next"
import { SupportCenterClient } from "@/app/components/support-center-client"

export const metadata: Metadata = {
  title: "Support Center",
  description: "Select a support topic, review helpful articles, and draft a message to the Avana team.",
}

export default function SupportCenterPage() {
  return <SupportCenterClient />
}
