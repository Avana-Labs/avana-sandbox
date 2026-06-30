/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as allocation from "../allocation.js";
import type * as cashflow from "../cashflow.js";
import type * as content from "../content.js";
import type * as crons from "../crons.js";
import type * as engagement from "../engagement.js";
import type * as liquidity from "../liquidity.js";
import type * as markets from "../markets.js";
import type * as prices from "../prices.js";
import type * as risk from "../risk.js";
import type * as sandbox_auth from "../sandbox/auth.js";
import type * as sandbox_liquidation from "../sandbox/liquidation.js";
import type * as sandbox_onboarding from "../sandbox/onboarding.js";
import type * as sandbox_rewards from "../sandbox/rewards.js";
import type * as sandbox_starterAllocation from "../sandbox/starterAllocation.js";
import type * as sandbox_transactions from "../sandbox/transactions.js";
import type * as seed from "../seed.js";
import type * as seedAdmin from "../seedAdmin.js";
import type * as starterTestMarkets from "../starterTestMarkets.js";
import type * as support from "../support.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  allocation: typeof allocation;
  cashflow: typeof cashflow;
  content: typeof content;
  crons: typeof crons;
  engagement: typeof engagement;
  liquidity: typeof liquidity;
  markets: typeof markets;
  prices: typeof prices;
  risk: typeof risk;
  "sandbox/auth": typeof sandbox_auth;
  "sandbox/liquidation": typeof sandbox_liquidation;
  "sandbox/onboarding": typeof sandbox_onboarding;
  "sandbox/rewards": typeof sandbox_rewards;
  "sandbox/starterAllocation": typeof sandbox_starterAllocation;
  "sandbox/transactions": typeof sandbox_transactions;
  seed: typeof seed;
  seedAdmin: typeof seedAdmin;
  starterTestMarkets: typeof starterTestMarkets;
  support: typeof support;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
