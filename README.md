# Avana

Avana is an LP-collateral protocol built around Aave v4. It lets liquidity providers borrow against active LP positions without unwinding liquidity from the underlying AMM.

This repo contains the Avana web app built with Next.js 15, React 19, TypeScript, and Tailwind CSS.

## What Avana Does

- Turns active LP positions into borrowable collateral.
- Keeps liquidity in the pool while trading fees continue to accrue.
- Uses market-specific valuation, risk controls, and liquidation logic for LP collateral.
- Builds on Aave v4's hub-and-spoke architecture to combine shared liquidity with isolated LP-specific risk management.

## Product Direction

Avana is designed to solve a core DeFi inefficiency: LP capital is productive, but usually not credit-usable unless a user exits the pool first.

The protocol is positioned around three major ideas:

- LP positions should remain active while being used as collateral.
- Valuation and liquidation must be tailored to venue-specific liquidity structures.
- Risk should be isolated at the market level rather than flattened across all collateral types.

## Protocol Model

At a high level, Avana works in three steps:

1. A user deposits a supported LP position.
2. Avana evaluates the position using LP-specific risk and pricing logic.
3. The user borrows against that position while liquidity stays active in the AMM.

The broader protocol roadmap described on the Avana lightpaper is:

- Phase 1: Token Markets
- Phase 2: Leverage / Perps Markets
- Phase 3: Pool Markets

## Supported Design Scope

The live Avana materials position the protocol around LP collateral across venues such as:

- Uniswap
- Curve
- Balancer
- Aerodrome

The risk model described publicly includes:

- LP-specific collateral factors
- dual-oracle validation
- market-specific spoke configuration
- controlled liquidation execution

## App Structure

This frontend includes pages for the main Avana product surfaces, including:

- `/` landing page
- `/borrow`
- `/earn`
- `/explore`
- `/invest`
- `/manage`
- `/rollover`
- `/stats`
- `/leaderboard`
- `/terms`
- `/policy`

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion
- Radix UI

## Brand References

This README is aligned to the current Avana public materials:

- Site: https://avana-ashen.vercel.app/
- Lightpaper: https://avana-ashen.vercel.app/lightpaper
- Terms: https://avana-ashen.vercel.app/terms
- Privacy: https://avana-ashen.vercel.app/privacy

## Disclaimer

This repository is a frontend application. Borrowing against LP positions involves risk, including liquidation risk if market conditions move against a position. Review the live Avana legal and protocol materials before using the product in any real environment.
# avana-webapp
