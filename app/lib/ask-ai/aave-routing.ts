export const AAVE_MODEL_TOOLS = [
  "get_apy_history",
  "get_reserve_details",
  "get_emode_categories",
  "get_aave_guide",
  "read_aave_positions",
  "get_user_rewards",
  "read_aave_preview",
  "search_governance_proposals",
  "get_governance_proposal",
  "get_proposal_votes",
  "get_hubs",
] as const
export type AaveModelTool = (typeof AAVE_MODEL_TOOLS)[number]

/** Select before looking at any external content. Bare names never trigger reads. */
export function routeAaveTool(prompt: string): AaveModelTool | undefined {
  if (!/\baave\b/i.test(prompt)) return undefined
  if (/\b(token price|price|prices|worth)\b/i.test(prompt)) return undefined
  const personal = /\b(my|mine|me|i|our)\b/i.test(prompt)
  if (personal && /\b(simulate|preview|what if|cross.check)\b/i.test(prompt)) return "read_aave_preview"
  if (personal && /\b(rewards?|claimable|merit)\b/i.test(prompt)) return "get_user_rewards"
  if (
    personal &&
    /\b(positions?|summary|balances?|holdings?|portfolio|activity|history|health factor|debt|supply|borrow|versus|vs)\b/i.test(
      prompt,
    )
  )
    return "read_aave_positions"
  if (/\b(governance|proposals?|votes?|voting|quorum)\b/i.test(prompt)) {
    const hasId = /\bproposal\s*#?\s*\d+\b/i.test(prompt)
    if (hasId && /\b(votes?|voters?|tally)\b/i.test(prompt)) return "get_proposal_votes"
    return hasId ? "get_governance_proposal" : "search_governance_proposals"
  }
  if (
    /\b(apy|apr|rate|rates|yield|yields|supply|borrow)\b/i.test(prompt) &&
    /\b(history|historical|chart|graph|trend|over time|week|month|year|7d|30d)\b/i.test(prompt)
  )
    return "get_apy_history"
  if (
    /\b(hubs?|hub assets|protocol history)\b/i.test(prompt) &&
    /\b(v4|liquidity|assets|history|show|list)\b/i.test(prompt)
  )
    return "get_hubs"
  if (/\b(e.?mode)\b/i.test(prompt) && /\b(categories|parameters|reserves|assets|list)\b/i.test(prompt))
    return "get_emode_categories"
  if (
    /\b(ltv|liquidation threshold|caps?|reserve factor|decimals|risk parameters|reserve details)\b/i.test(prompt) &&
    !/\b(what is|explain|how does)\b/i.test(prompt)
  )
    return "get_reserve_details"
  if (/\b(apy|apr|rate|rates|yield|yields)\b/i.test(prompt) && !/\b(how|explain|work|works)\b/i.test(prompt))
    return undefined
  if (/\b(how|explain|what is|what are|guide|work|works|risks?)\b/i.test(prompt)) return "get_aave_guide"
  return undefined
}
