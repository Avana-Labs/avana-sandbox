import type { ReactNode } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { HomePageWorkspaceRuntime } from "@/app/components/home-page-workspace-runtime"

vi.mock("next/dynamic", () => ({
  default: (_loader: unknown, options: { loading: () => ReactNode }) => options.loading,
}))

vi.mock("@/app/components/home/home-workspace-card", () => ({
  HomeWorkspaceCard: ({ children, onModeChange }: { children: ReactNode; onModeChange: (mode: "borrow") => void }) => (
    <div>
      <button type="button" onClick={() => onModeChange("borrow")}>
        Borrow
      </button>
      {children}
    </div>
  ),
}))

vi.mock("@/app/components/home/home-swap-action", () => ({
  HomeSwapAction: () => <div>Swap form</div>,
}))

vi.mock("@/app/components/action-page/borrow-action-page-client", () => ({
  BorrowActionPageClient: () => <div data-testid="borrow-action">Borrow form</div>,
}))

vi.mock("@/app/lib/avana-session/avana-sessions-provider", () => ({
  AvanaSessionsProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useBorrowSessionContext: () => ({ availableCollateralPools: [{ id: "pool" }] }),
  useRewardsSessionContext: () => ({ applyReferralCode: vi.fn(), hasHydratedStorage: false }),
}))

describe("HomePageWorkspaceRuntime", () => {
  it("P1-22 keeps one homepage shell instead of nesting HomeWorkspaceSkeleton", () => {
    render(<HomePageWorkspaceRuntime />)

    fireEvent.click(screen.getByRole("button", { name: "Borrow" }))

    expect(screen.getByTestId("borrow-action")).toBeInTheDocument()
    expect(screen.queryByTestId("home-workspace-loading")).not.toBeInTheDocument()
  })
})
