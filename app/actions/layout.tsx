import type { ReactNode } from "react"
import { ActionsLayoutChrome } from "@/app/actions/actions-layout-chrome"

// Standalone /actions/* pages normally keep the full site header. /actions/lend/withdraw
// is currently opted into the action-flow header prototype without changing the rest.
export default function ActionsLayout({ children }: { children: ReactNode }) {
  return <ActionsLayoutChrome>{children}</ActionsLayoutChrome>
}
