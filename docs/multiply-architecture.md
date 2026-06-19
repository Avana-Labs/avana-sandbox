# Multiply Architecture

Multiply is a separate sandbox product from Borrow. Both share wallet identity but use independent engines, adapters, sessions, and mock state.

## Shared

- Wallet profile / `walletId`
- Sandbox mode labeling in UI
- Portfolio shell tabs (Borrow + Multiply + Activity)
- Transaction flow UI primitives

## Borrow-specific

- LP collateral markets
- Actions: deposit, borrow, repay, withdraw, claim, liquidate
- `useBorrowSession` → `SandboxTransactionAdapter` → `credit-engine`

## Multiply-specific

- Single collateral asset loop markets
- Actions: multiply, deleverage
- `useMultiplySession` → `SandboxMultiplyTransactionAdapter` → `multiply-engine`

## Sandbox flow

```
UI → useMultiplySession → SandboxMultiplyTransactionAdapter
  → multiply-engine simulate/validate → mock state update → synthetic receipt
```

## Production boundary

Production should replace only the multiply read/transaction adapters. UI and `multiply-engine` preflight remain stable.

## Stress testing

`app/lib/multiply-engine/__tests__/scale-100-users.test.ts` runs 100 heterogeneous wallet sessions through batch multiply/deleverage actions and asserts invariants plus adapter read consistency.
