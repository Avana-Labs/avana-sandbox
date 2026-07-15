import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { useQuery } = vi.hoisted(() => ({ useQuery: vi.fn() }));

vi.mock("convex/react", () => ({ useQuery }));
vi.mock("@/app/lib/convex/market-liquidity-provider", () => ({
  hasConvexClient: true,
}));
vi.mock("@/app/lib/test-mode", () => ({ isLighthouseAuditMode: () => true }));
vi.mock("@/app/lib/siwe/use-siwe-auth", () => ({
  useSiweAuth: () => ({ isSignedIn: true }),
}));

import { TokenPricesProvider } from "@/app/lib/prices/token-prices-context";

describe("TokenPricesProvider audit mode", () => {
  it("uses static labels without opening a live Convex subscription", () => {
    render(
      <TokenPricesProvider>
        <span>market content</span>
      </TokenPricesProvider>,
    );

    expect(screen.getByText("market content")).toBeInTheDocument();
    expect(useQuery).not.toHaveBeenCalled();
  });
});
