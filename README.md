# Avana

Avana is an LP-collateral protocol built on Aave v4. It enables liquidity providers to borrow against active LP positions without withdrawing liquidity from the underlying AMM.

This repository contains the Avana web application, built with Next.js 15, React 19, TypeScript, and Tailwind CSS.

## Overview

In DeFi, LP capital is often productive but not credit-accessible unless users first exit their positions. Avana is designed to solve that inefficiency by turning active LP positions into usable collateral.

With Avana, users can:

- Borrow against active LP positions
- Keep liquidity deployed in the AMM
- Continue earning trading fees while accessing liquidity
- Benefit from venue-specific valuation, risk controls, and liquidation logic

Built on Aave v4’s hub-and-spoke architecture, Avana combines shared liquidity with isolated, LP-specific risk management.

## Core Thesis

Avana is built around three core principles:

- **Active LP positions should remain productive while serving as collateral**
- **Valuation and liquidation must reflect venue-specific liquidity mechanics**
- **Risk should be isolated at the market level, not generalized across all collateral types**

## How It Works

At a high level, the protocol works in three steps:

1. A user deposits a supported LP position
2. Avana evaluates the position using LP-specific pricing and risk logic
3. The user borrows against that position while the liquidity remains active in the AMM

## Protocol Roadmap

The Avana lightpaper outlines the following phased roadmap:

- **Phase 1:** Token Markets
- **Phase 2:** Leverage / Perps Markets
- **Phase 3:** Pool Markets

## Supported Design Scope

Avana’s current public design centers on LP collateral across AMMs and liquidity venues such as:

- Uniswap
- Curve
- Balancer
- Aerodrome

Its public risk framework includes:

- LP-specific collateral factors
- Dual-oracle validation
- Market-specific spoke configuration
- Controlled liquidation execution
