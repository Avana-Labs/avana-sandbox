# Avana Webapp (Sandbox)

Interactive frontend for exploring **Avana** — borrow against LP positions on Aave v4 — before the production app ships. Everything runs locally with **synthetic wallets, markets, and transactions** so you can learn flows, stress-test UX, and validate engine behavior without mainnet risk.

## What this is

| | |
|---|---|
| **Purpose** | Hands-on sandbox for Borrow, Lend, Multiply, Rewards, and portfolio flows |
| **Data** | Mock catalogs + in-browser session state (persisted per demo wallet in `localStorage`) |
| **Engines** | Real TypeScript simulation/validation for borrow (`credit-engine`), lend, and multiply |
| **Not included** | Live chain RPC, real wallet signing, or production contracts |

Use it to answer: *How does pledging LP collateral feel? What happens when health factor drops? Can I follow borrow → repay → claim without leaving the app?*

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The default **demo wallet** is pre-seeded with collateral, debt, and LP balances.

### Quality checks

```bash
npm test              # unit + integration (Vitest)
npx tsc --noEmit      # TypeScript
npm run build         # production build
npx playwright test   # optional UI audits (requires dev server)
```

## Main routes

| Route | What to try |
|-------|-------------|
| `/` | Home workspace — Borrow, Repay, Claim, Remove in one card |
| `/borrow` | Market explorer + pool detail pages with sidebar actions |
| `/lend` | Supply / withdraw stable and volatile assets |
| `/multiply` | Loop markets, leverage ruler, deleverage |
| `/dashboard` | Portfolio tabs: Borrow, Lend, Multiply, Activity |
| `/rewards` | AVA quest rewards + product-linked claim flows |
| `/actions/...` | Full-screen action modals (configure → review → sign → success) |

**Action modal pattern:** `/actions/{product}/{kind}` — e.g. `/actions/borrow/borrow?asset=uni-v3-bluechip:usdc&amount=500`.

## Core flows to exercise

1. **Borrow** — Select collateral pool → enter amount → review health factor / borrowing power → simulate transaction.
2. **Pledge (supply collateral)** — Pick an LP pool you hold → deposit → see borrow power increase.
3. **Repay / Remove / Claim** — Pay down debt, withdraw collateral %, or claim fee rewards.
4. **Lend** — Deposit wallet balance into a market; withdraw supplied position.
5. **Multiply** — Set collateral amount + multiplier; review net APY, LTV, liquidation price.
6. **Rewards** — Complete quest-style tasks; claim AVA and product rewards.

Wallet steps are **simulated** (allowance → sign → processing → success) with receipt hashes stored in session history.

## Architecture (high level)

```
app/
├── components/action-page/   # Shared action UI (configure, review, success)
├── lib/
│   ├── credit-engine/        # Borrow math, validation, simulation
│   ├── borrow-system/        # Borrow session + sandbox transaction adapter
│   ├── lend-engine/          # Lend simulation
│   ├── multiply-engine/      # Leverage / deleverage math
│   └── avana-session/        # Wires borrow + lend + multiply + rewards
└── borrow | lend | multiply/ # Product hubs and detail pages
```

- **Sessions** reset via browser storage keys (`avana.borrow.session.v1:*`, etc.).
- **Previews** call engine simulators; blocked actions show human-readable reasons (not raw errors).
- **Themes** — light / dark / system via the header preferences menu.

## Resetting sandbox state

Clear site data for `localhost` in your browser, or use in-app flows that write fresh seeds. Stale `localStorage` from older builds is normalized on load (e.g. missing `rewardPositions` on accounts).

## Deployment

Production preview: [https://avana-ashen.vercel.app/](https://avana-ashen.vercel.app/)

Lightpaper: [https://avana-ashen.vercel.app/lightpaper](https://avana-ashen.vercel.app/lightpaper)

## Contributing

Keep changes focused: engine logic in `app/lib/*-engine`, product UI in `app/{borrow,lend,multiply}`, shared action chrome in `app/components/action-page`. Run `npm test` and `npm run build` before opening a PR.
