# avana-webapp

Avana is an LP-collateral protocol built around Aave v4. The product is designed to help liquidity providers unlock credit from active LP positions without exiting the underlying pool or interrupting fee generation.

This repository contains the Avana web app built with Next.js 15, React 19, TypeScript, and Tailwind CSS.

## Overview

The app reflects Avana's core protocol story:

- active LP positions can be used as collateral
- liquidity can stay deployed while capital becomes more flexible
- risk management is tailored to venue-specific liquidity structures
- Aave v4's hub-and-spoke design supports isolated market logic with shared liquidity rails

The public Avana materials position the protocol around LP collateral across ecosystems such as Uniswap, Curve, Balancer, and Aerodrome.

## Current Pages

- `/`
- `/borrow`
- `/lend` (legacy `/invest` redirects here)
- `/perps`
- `/manage`
- `/stake`
- `/rewards`
- `/risk-warning`

## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

## Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion
- Radix UI

## Reference Links

- Site: https://avana-ashen.vercel.app/
- Lightpaper: https://avana-ashen.vercel.app/lightpaper

## Note

This project is a frontend application for a DeFi protocol concept. LP-backed borrowing carries market, liquidation, and smart contract risk, so public protocol materials should be reviewed before any real usage or deployment.
