import { cleanup, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ResponsiveMultiplyAction } from "@/app/components/action-page/responsive-multiply-action"

vi.mock("@/app/lib/use-media-query", () => ({
  useMediaQuery: () => false,
}))

vi.mock("@/app/components/action-page/multiply-action-page-client", () => ({
  MultiplyActionPageClient: (props: { kind: string; initialMultiplier?: string }) => (
    <div data-testid="multiply-action-client">
      {props.kind}:{props.initialMultiplier ?? ""}
    </div>
  ),
}))

vi.mock("@/app/components/action-page/detail-sidebar-action-card", () => ({
  DetailSidebarActionCard: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock("@/app/components/action-page/action-page-launch-cta", () => ({
  ActionPageLaunchCta: () => <div data-testid="launch-cta" />,
}))

describe("ResponsiveMultiplyAction", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the embedded multiply action in sidebar mode on mobile", () => {
    render(
      <ResponsiveMultiplyAction
        kind="deleverage"
        market="aave-gho"
        closeHref="/multiply/markets/aave-gho"
        sidebar
        initialMultiplier="1.5"
      />,
    )

    expect(screen.getByTestId("multiply-action-client")).toHaveTextContent("deleverage:1.5")
    expect(screen.queryByTestId("launch-cta")).not.toBeInTheDocument()
  })
})
