# Avana Product Architecture

Borrow, Multiply, and Lend are separate sandbox products that share wallet identity through `AvanaSessionsProvider`.

## Shared

- Wallet profile / `walletId` via `useAvanaSession`
- Sandbox mode labeling in UI
- Dashboard shell tabs (Lend, Borrow, Multiply, Activity)
- Transaction flow UI primitives

## Borrow-specific

- LP collateral markets
- Actions: deposit, borrow, repay, withdraw, claim, liquidate
- `useBorrowSession` → `SandboxTransactionAdapter` → `credit-engine`

## Multiply-specific

- Single collateral asset loop markets
- Actions: multiply, deleverage
- `useMultiplySession` → `SandboxMultiplyTransactionAdapter` → `multiply-engine`

## Lend-specific

- Single supplied asset, no debt, no health factor, no liquidation, no multiplier
- Actions: deposit, withdraw
- `useLendSession` → `SandboxLendTransactionAdapter` → `lend-engine`

## Sandbox flow (Lend)

```
UI → useLendSession → SandboxLendTransactionAdapter
  → lend-engine simulate/validate → mock state update → synthetic receipt
```

## Production boundary

Production should replace only the lend read/transaction adapters. UI and `lend-engine` preflight remain stable.
