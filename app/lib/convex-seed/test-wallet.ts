/**
 * Canonical test-wallet address that seeded per-wallet rows belong to. Dev
 * sessions (via the test-wallet gate) resolve the connected wallet to this
 * constant so the home page renders populated portfolio cards without a real
 * wallet connection. Production wallets never collide because they use
 * 0x-prefixed hex.
 *
 * Kept in its own module so both build-seed.ts and the input files under
 * ./inputs/ can import it without a circular dependency.
 */
export const TEST_WALLET_ADDRESS = "test-wallet-000"
