/**
 * Shared static-content generators (FAQs) for the borrow detail pages. Pure and
 * deterministic — the single source for BOTH the UI fallback and the Convex content
 * seed (so seeded FAQs are identical to the fallback). Answers are plain text; the
 * UI wraps them in a <p>.
 */

export type FaqContent = { question: string; answer: string }

/** General FAQs for a borrowable asset (templated by symbol + name). */
export function buildAssetFaqs(symbol: string, name: string): FaqContent[] {
  return [
    {
      question: `What is ${symbol}?`,
      answer: `${name} is a borrowable asset listed on Avana. It can be borrowed anywhere the selected collateral market supports it, with rates and limits determined by the active market risk settings.`,
    },
    {
      question: `How do I supply ${symbol}?`,
      answer: `Open the market, choose Deposit, enter the amount you want to supply, and confirm the transaction in your wallet. Your balance and available supply capacity update after the transaction settles.`,
    },
    {
      question: `What moves the APY for ${symbol}?`,
      answer: `APY changes with utilization, available liquidity, and incentive changes. When more capital is borrowed from a market, supply rates usually move higher as the pool becomes tighter.`,
    },
    {
      question: `Can I borrow against ${symbol}?`,
      answer: `If this asset is enabled as collateral, your borrowing power depends on the market's loan-to-value and risk parameters. More volatile assets generally support less borrowing than steadier collateral.`,
    },
    {
      question: `What risks should I watch?`,
      answer: `The main risks are price moves, utilization spikes, and liquidation if your health factor falls too low. If you supply the asset, there is also protocol and market risk, so it helps to watch the dashboard before making larger positions.`,
    },
  ]
}

/** General FAQs for a lend (single-asset supply) market (templated by symbol + name). */
export function buildLendFaqs(symbol: string, name: string): FaqContent[] {
  return [
    {
      question: `What is supplying ${symbol}?`,
      answer: `Supplying ${name} deposits it into the Avana lending market to earn yield. Your deposit earns the supply APY plus any active rewards, and you can withdraw available liquidity at any time.`,
    },
    {
      question: `How is the ${symbol} supply APY determined?`,
      answer: `The supply APY tracks borrow demand: as utilization rises, borrowers pay more and a larger share flows to suppliers. Rewards APY, when present, is an additional incentive on top of the base rate.`,
    },
    {
      question: `Can I withdraw my ${symbol} anytime?`,
      answer: `You can withdraw up to the market's available liquidity at any time. When utilization is very high, withdrawable liquidity may be limited until borrowers repay or new supply arrives.`,
    },
    {
      question: `What risks should I watch when supplying ${symbol}?`,
      answer: `The main risks are smart-contract risk, the asset's own volatility or de-peg risk, and utilization spikes that temporarily limit withdrawals. Higher-risk-tier markets carry a larger reserve factor.`,
    },
    {
      question: "What is the reserve factor?",
      answer: "The reserve factor is the share of borrower interest the protocol retains as a safety buffer rather than passing to suppliers. Lower-risk markets use a smaller reserve factor.",
    },
  ]
}

/** General FAQs for a multiply (leveraged loop) market (templated by the pair). */
export function buildMultiplyFaqs(collateral: string, borrow: string): FaqContent[] {
  return [
    {
      question: `What is the ${collateral} / ${borrow} multiply market?`,
      answer: `It pairs ${collateral} collateral with ${borrow} exposure in a leveraged loop. The route is separate from borrow pools and is meant for leveraged positioning.`,
    },
    {
      question: "How does max APY work here?",
      answer: "Max APY reflects the combination of collateral carry and borrow cost at the current leverage ceiling. It is the ceiling shown in the table, not a fixed return.",
    },
    {
      question: "Why is leverage capped?",
      answer: "The cap keeps liquidation risk within the available liquidity and collateral threshold for the pair. Higher leverage increases both capital efficiency and unwind speed.",
    },
    {
      question: `Why use ${collateral} as collateral?`,
      answer: `This market is tuned for the ${collateral} / ${borrow} combination because its liquidity profile and factor settings leave enough room to multiply exposure without making the position unstable.`,
    },
  ]
}

/** General FAQs for an LP collateral pool (templated by pair name). */
export function buildPoolFaqs(name: string): FaqContent[] {
  return [
    {
      question: `What is ${name}?`,
      answer: `${name} is a liquidity pool. LPs deposit both sides of the pair so traders can swap between them without a traditional order book, and the pool earns fees when it is used.`,
    },
    {
      question: "How do liquidity providers earn?",
      answer: "LPs earn a share of the swap fees generated by the pool. The higher the trading activity, the more fee flow the position can capture, though returns still depend on market movement and range usage.",
    },
    {
      question: "What is impermanent loss?",
      answer: "Impermanent loss is the gap between holding the two tokens outright and providing them in a pool while the price moves. It is usually smaller in calmer pairs and larger when one side moves sharply.",
    },
    {
      question: `Why do pools like ${name} matter?`,
      answer: `Pairs like ${name} help route trading between a volatile asset and a dollar-denominated quote asset. They tend to be useful when traders want price exposure, inventory balancing, or deep swap liquidity.`,
    },
    {
      question: "What happens if the price moves outside the active range?",
      answer: "In concentrated-liquidity pools, the position can stop earning fees until price comes back into range. That tradeoff is the main reason tighter ranges can earn more, but also require more active management.",
    },
    {
      question: "What should I watch before adding liquidity?",
      answer: "Check the fee tier, current depth, volatility, and how often the pool rebalances around the current price. Rapid price moves can increase divergence risk and reduce the time a narrow range stays active.",
    },
  ]
}
