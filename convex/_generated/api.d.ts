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
import type * as engagement from "../engagement.js";
import type * as liquidity from "../liquidity.js";
import type * as markets from "../markets.js";
import type * as sandbox_auth from "../sandbox/auth.js";
import type * as sandbox_onboarding from "../sandbox/onboarding.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  allocation: typeof allocation;
  cashflow: typeof cashflow;
  engagement: typeof engagement;
  liquidity: typeof liquidity;
  markets: typeof markets;
  "sandbox/auth": typeof sandbox_auth;
  "sandbox/onboarding": typeof sandbox_onboarding;
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
