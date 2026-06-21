# Rewards Task Audit

This file is the task-by-task audit ledger for the sandbox rewards system on `/rewards`.
It records what each live quest requires and where its current verification evidence lives.

## New users

| Task ID | Card title | Requirement | Current evidence |
| --- | --- | --- | --- |
| `connect-wallet` | Boot your sandbox wallet | `wallet_connected` once | `catalog-audit.test.ts`, `task-requirements.test.ts`, live `/rewards` initial claim state |
| `create-profile` | Spin up your profile | `profile_completed` once | `catalog-audit.test.ts`, `task-requirements.test.ts`, live `/rewards` initial claim state |
| `review-risk-basics` | Read the sandbox risk primer | `education_completed` once | `task-requirements.test.ts`, `rewards-page-client.test.tsx` education dialog |
| `favorite-market` | Pin a market to your watchlist | `market_favorited` once | `task-requirements.test.ts`, `rewards-page-client.test.tsx` favorite dialog |
| `run-first-simulation` | Preview your first trade | `simulation_created` once | `task-requirements.test.ts`, `rewards-page-client.test.tsx` simulate dialog |
| `first-lend-deposit` | Make your first sandbox lend | `lend_deposited` once | `task-requirements.test.ts`, `rewards-bridge.test.tsx`, deep-link CTA verified in page test, live browser deposit on `/lend` moved card to `Claim 40 AVA` |
| `first-borrow` | Open your first sandbox borrow | `borrow_opened` once | `task-requirements.test.ts`, `rewards-bridge.test.tsx`, `rewards-product-flows.test.tsx`, claim flow in page test |
| `first-multiply` | Open your first sandbox multiply | `multiply_opened` once | `task-requirements.test.ts`, `rewards-bridge.test.tsx`, `rewards-product-flows.test.tsx` |
| `first-repay` | Repay a sandbox loan | `borrow_repaid` once | `task-requirements.test.ts`, `rewards-product-flows.test.tsx` |
| `first-deleverage` | Deleverage a sandbox position | `multiply_deleveraged` once | `task-requirements.test.ts`, `rewards-product-flows.test.tsx` |
| `first-reward-claim` | Claim your first AVA reward | `reward_claimed` once | `task-requirements.test.ts`, live chained claim verification on `/rewards` |
| `maintain-safe-account` | Sandbox cool-down | `wait_since_login` for 2 minutes | `task-requirements.test.ts`, live `/rewards` countdown verification |

## Challenge tasks

| Task ID | Card title | Requirement | Current evidence |
| --- | --- | --- | --- |
| `supply-5k-lend` | Lend $500 in the sandbox | aggregate `lend_deposited >= 500 USD` | `task-requirements.test.ts`, `catalog-audit.test.ts`, `rewards-product-flows.test.tsx`, live browser deposit of `500 GHO` moved challenge card to `Claim 100 AVA` |
| `borrow-2k` | Borrow $200 in the sandbox | aggregate `borrow_opened >= 200 USD` | `task-requirements.test.ts`, `rewards-product-flows.test.tsx` |
| `open-2x-multiply` | Launch a multiply position | `multiply_opened` once | `task-requirements.test.ts` |
| `use-3-products` | Tour all three products | one qualifying action in `lend`, `borrow`, and `multiply` | `task-requirements.test.ts`, `rewards-product-flows.test.tsx` |
| `use-curve-position` | Curve sandbox tour | `sandbox_tour_completed` for `curve-sandbox-tour` | `task-requirements.test.ts`, `rewards-page-client.test.tsx` sandbox tour CTA |
| `use-uniswap-v4-position` | Uniswap v4 sandbox tour | `sandbox_tour_completed` for `uniswap-v4-sandbox-tour` | `task-requirements.test.ts` |
| `maintain-hf-above-2` | Risk check-in (5 min) | `wait_since_login` for 5 minutes | `task-requirements.test.ts`, live `/rewards` countdown verification |
| `keep-multiply-safe` | Multiply mindfulness (3 min) | `wait_since_login` for 3 minutes | `task-requirements.test.ts`, live `/rewards` countdown verification |
| `complete-5-borrow-repay-cycles` | 3 borrow / repay loops | `borrow_repaid` three times | `task-requirements.test.ts`, `rewards-product-flows.test.tsx` |
| `complete-3-multiply-deleverage-cycles` | 2 deleverage drills | `multiply_deleveraged` twice | `task-requirements.test.ts`, `rewards-product-flows.test.tsx` |
| `activate-5-markets` | Explore 3 sandbox markets | `sandbox_tour_completed` three times | `task-requirements.test.ts` |
| `claim-rewards-5-times` | Claim 3 quest rewards | `reward_claimed` three times | `task-requirements.test.ts`, `rewards-product-flows.test.tsx`, live chained claim verification on `/rewards` |
| `4-week-activity-streak` | 3-day sandbox streak | `daily_checkin` streak of three days | `task-requirements.test.ts`, `rewards-page-client.test.tsx`, live `0/3 -> 1/3` verification |
| `grow-portfolio-10k` | Grow sandbox portfolio by $1K | aggregate lend/borrow/multiply volume `>= 1000 USD` | `task-requirements.test.ts`, `rewards-product-flows.test.tsx`, multiply amount bridge fix in `avana-sessions-provider.tsx` |
| `open-8-active-positions` | Open 3 sandbox positions | three distinct qualifying `marketId`s across lend/borrow/multiply | `task-requirements.test.ts`, `rewards-product-flows.test.tsx`, engine fix in `evaluate.ts` |

## Refer a friend

| Task ID | Card title | Requirement | Current evidence |
| --- | --- | --- | --- |
| `share-referral-link` | Copy your sandbox invite link | `referral_link_created` once | `task-requirements.test.ts`, `rewards-page-client.test.tsx`, live referral dialog verification |
| `invite-first-wallet` | Send your first sandbox invite | one distinct `referral_connected` wallet | `task-requirements.test.ts`, `rewards-page-client.test.tsx` invite flow |
| `first-funded-referral` | Fund a referred sandbox wallet | one distinct `referral_funded` wallet | `task-requirements.test.ts`, `rewards-page-client.test.tsx` funded flow |
| `bring-3-active-users` | Activate 3 sandbox friends | three distinct `referral_activated` wallets | `task-requirements.test.ts`, `rewards-page-client.test.tsx` activate flow and claimable dialog claim |
| `bring-5-active-users` | Grow crew to 5 actives | five distinct `referral_activated` wallets | `task-requirements.test.ts` |
| `referral-cohort-25k` | Referral sandbox hits $500 | aggregate `referral_funded >= 500 USD` | `task-requirements.test.ts` |
| `referral-streak` | Referral streak (2 activations) | two distinct `referral_activated` wallets | `task-requirements.test.ts` |
| `avana-ambassador` | Sandbox ambassador | five distinct `referral_activated` wallets | `task-requirements.test.ts` |

## Diagnostics

- Engine-wide audit: `app/lib/rewards-engine/__tests__/catalog-audit.test.ts`
- Per-task thresholds and summary math: `app/lib/rewards-engine/__tests__/task-requirements.test.ts`
- Engine summary behavior: `app/lib/rewards-engine/__tests__/evaluate.test.ts`
- 1,000-wallet scale run: `app/lib/rewards-engine/__tests__/scale-1000-users.test.ts`
- Session adapters: `app/lib/rewards-system/__tests__/sandbox-adapters.test.ts`, `app/lib/rewards-system/__tests__/use-rewards-session.test.tsx`
- Transaction bridge: `app/lib/avana-session/__tests__/rewards-bridge.test.tsx`
- Cross-product sandbox flow: `app/lib/avana-session/__tests__/rewards-product-flows.test.tsx`
- Rewards page actions: `app/rewards/__tests__/rewards-page-client.test.tsx`

## Known remaining gaps

- Live browser verification now covers the lend success path after fixing the trapped success CTA in `lend-action-box.tsx`, `multiply-action-box.tsx`, and `deleverage-modal.tsx`.
- Not every deep-link task has been manually executed end-to-end through the Borrow and Multiply product screens in the browser yet.
- The current PR is not split into 35 separate commits; evidence is consolidated in broader audit commits.
- `/rewards` still emits a non-blocking Next/Image sizing warning for `avana-icon.svg` during local runtime verification.
