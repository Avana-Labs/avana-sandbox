# Coinbase Wallet SDK telemetry fires on every navigation

**Priority:** LOW · **Area:** infra

`cca-lite.coinbase.com/metrics` is POSTed on every navigation even for users who never pick Coinbase (`app/lib/web3/web3-provider.tsx:~41`, `coinbaseWalletPreference: "all"`). Drop the Coinbase connector or set `smartWalletOnly`, then tighten the CSP `connect-src`.
