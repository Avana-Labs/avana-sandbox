import { describe, expect, it } from "vitest"
import { buildDefaultRewardsCatalog, calculateRewardSummary, evaluateTaskProgress } from "@/app/lib/rewards-engine"
import type { RewardActivityEvent, RewardTask } from "@/app/lib/rewards-engine"
import { buildSandboxCompletionEvents } from "@/app/lib/rewards-engine/task-completion"

const DAY_MS = 24 * 60 * 60 * 1000
const now = Date.UTC(2026, 5, 20)
const wallet = "wallet-task-requirements"

function getTask(taskId: string) {
  const task = buildDefaultRewardsCatalog(now).find((entry) => entry.id === taskId)
  if (!task) throw new Error(`missing task ${taskId}`)
  return task
}

function event(
  id: string,
  type: RewardActivityEvent["type"],
  product: RewardActivityEvent["product"],
  extra: Partial<RewardActivityEvent> = {},
): RewardActivityEvent {
  return {
    id,
    wallet,
    type,
    product,
    timestamp: now,
    ...extra,
  }
}

type TaskSpec = {
  taskId: string
  partialEvents?: RewardActivityEvent[]
  completeEvents?: RewardActivityEvent[]
  beforeStatus?: "available" | "in_progress"
}

const taskSpecs: TaskSpec[] = [
  {
    taskId: "connect-wallet",
    completeEvents: [event("connect-wallet", "wallet_connected", "profile")],
  },
  {
    taskId: "create-profile",
    completeEvents: [event("create-profile", "profile_completed", "profile")],
  },
  {
    taskId: "review-risk-basics",
    completeEvents: [event("risk-primer", "education_completed", "education")],
  },
  {
    taskId: "favorite-market",
    completeEvents: [event("favorite-market", "market_favorited", "profile", { marketId: "gho" })],
  },
  {
    taskId: "run-first-simulation",
    completeEvents: [event("simulation", "simulation_created", "borrow")],
  },
  {
    taskId: "first-lend-deposit",
    completeEvents: [event("lend-first", "lend_deposited", "lend", { amountUsd: 100, marketId: "gho" })],
  },
  {
    taskId: "first-borrow",
    completeEvents: [event("borrow-first", "borrow_opened", "borrow", { amountUsd: 100, marketId: "pool-a" })],
  },
  {
    taskId: "first-multiply",
    completeEvents: [event("multiply-first", "multiply_opened", "multiply", { amountUsd: 100, marketId: "eth-usdt" })],
  },
  {
    taskId: "first-repay",
    completeEvents: [event("repay-first", "borrow_repaid", "borrow", { amountUsd: 50, marketId: "pool-a" })],
  },
  {
    taskId: "first-deleverage",
    completeEvents: [
      event("deleverage-first", "multiply_deleveraged", "multiply", { amountUsd: 50, marketId: "eth-usdt" }),
    ],
  },
  {
    taskId: "first-reward-claim",
    completeEvents: [event("reward-first", "reward_claimed", "rewards", { amountUsd: 25 })],
  },
  {
    taskId: "maintain-safe-account",
    beforeStatus: "in_progress",
  },
  {
    taskId: "supply-5k-lend",
    partialEvents: [event("lend-200", "lend_deposited", "lend", { amountUsd: 200, marketId: "gho" })],
    completeEvents: [
      event("lend-200", "lend_deposited", "lend", { amountUsd: 200, marketId: "gho" }),
      event("lend-300", "lend_deposited", "lend", { amountUsd: 300, marketId: "gho", timestamp: now + 1 }),
    ],
    beforeStatus: "in_progress",
  },
  {
    taskId: "borrow-2k",
    partialEvents: [event("borrow-100", "borrow_opened", "borrow", { amountUsd: 100, marketId: "pool-a" })],
    completeEvents: [
      event("borrow-100", "borrow_opened", "borrow", { amountUsd: 100, marketId: "pool-a" }),
      event("borrow-100b", "borrow_opened", "borrow", { amountUsd: 100, marketId: "pool-b", timestamp: now + 1 }),
    ],
    beforeStatus: "in_progress",
  },
  {
    taskId: "open-2x-multiply",
    completeEvents: [event("multiply-any", "multiply_opened", "multiply", { amountUsd: 300, marketId: "eth-usdt" })],
  },
  {
    taskId: "use-3-products",
    partialEvents: [
      event("use-lend", "lend_deposited", "lend", { amountUsd: 100, marketId: "gho" }),
      event("use-borrow", "borrow_opened", "borrow", { amountUsd: 100, marketId: "pool-a", timestamp: now + 1 }),
    ],
    completeEvents: [
      event("use-lend", "lend_deposited", "lend", { amountUsd: 100, marketId: "gho" }),
      event("use-borrow", "borrow_opened", "borrow", { amountUsd: 100, marketId: "pool-a", timestamp: now + 1 }),
      event("use-multiply", "multiply_opened", "multiply", {
        amountUsd: 100,
        marketId: "eth-usdt",
        timestamp: now + 2,
      }),
    ],
    beforeStatus: "in_progress",
  },
  {
    taskId: "use-curve-position",
    completeEvents: [event("curve-tour", "sandbox_tour_completed", "borrow", { marketId: "curve-sandbox-tour" })],
  },
  {
    taskId: "use-uniswap-v4-position",
    completeEvents: [
      event("uniswap-tour", "sandbox_tour_completed", "borrow", { marketId: "uniswap-v4-sandbox-tour" }),
    ],
  },
  {
    taskId: "maintain-hf-above-2",
    beforeStatus: "in_progress",
  },
  {
    taskId: "keep-multiply-safe",
    beforeStatus: "in_progress",
  },
  {
    taskId: "complete-5-borrow-repay-cycles",
    partialEvents: [
      event("repay-1", "borrow_repaid", "borrow", { amountUsd: 50, marketId: "pool-a" }),
      event("repay-2", "borrow_repaid", "borrow", { amountUsd: 50, marketId: "pool-b", timestamp: now + 1 }),
    ],
    completeEvents: [
      event("repay-1", "borrow_repaid", "borrow", { amountUsd: 50, marketId: "pool-a" }),
      event("repay-2", "borrow_repaid", "borrow", { amountUsd: 50, marketId: "pool-b", timestamp: now + 1 }),
      event("repay-3", "borrow_repaid", "borrow", { amountUsd: 50, marketId: "pool-c", timestamp: now + 2 }),
    ],
    beforeStatus: "in_progress",
  },
  {
    taskId: "complete-3-multiply-deleverage-cycles",
    partialEvents: [event("deleverage-1", "multiply_deleveraged", "multiply", { amountUsd: 50, marketId: "eth-usdt" })],
    completeEvents: [
      event("deleverage-1", "multiply_deleveraged", "multiply", { amountUsd: 50, marketId: "eth-usdt" }),
      event("deleverage-2", "multiply_deleveraged", "multiply", {
        amountUsd: 50,
        marketId: "btc-usdc",
        timestamp: now + 1,
      }),
    ],
    beforeStatus: "in_progress",
  },
  {
    taskId: "activate-5-markets",
    partialEvents: [
      event("tour-1", "sandbox_tour_completed", "borrow", { marketId: "market-tour-1" }),
      event("tour-2", "sandbox_tour_completed", "borrow", { marketId: "market-tour-2", timestamp: now + 1 }),
    ],
    completeEvents: [
      event("tour-1", "sandbox_tour_completed", "borrow", { marketId: "market-tour-1" }),
      event("tour-2", "sandbox_tour_completed", "borrow", { marketId: "market-tour-2", timestamp: now + 1 }),
      event("tour-3", "sandbox_tour_completed", "borrow", { marketId: "market-tour-3", timestamp: now + 2 }),
    ],
    beforeStatus: "in_progress",
  },
  {
    taskId: "claim-rewards-5-times",
    partialEvents: [
      event("claim-1", "reward_claimed", "rewards", { amountUsd: 10 }),
      event("claim-2", "reward_claimed", "rewards", { amountUsd: 15, timestamp: now + 1 }),
    ],
    completeEvents: [
      event("claim-1", "reward_claimed", "rewards", { amountUsd: 10 }),
      event("claim-2", "reward_claimed", "rewards", { amountUsd: 15, timestamp: now + 1 }),
      event("claim-3", "reward_claimed", "rewards", { amountUsd: 20, timestamp: now + 2 }),
    ],
    beforeStatus: "in_progress",
  },
  {
    taskId: "4-week-activity-streak",
    partialEvents: [
      event("checkin-1", "daily_checkin", "profile", { timestamp: now }),
      event("checkin-2", "daily_checkin", "profile", { timestamp: now + DAY_MS }),
    ],
    completeEvents: [
      event("checkin-1", "daily_checkin", "profile", { timestamp: now }),
      event("checkin-2", "daily_checkin", "profile", { timestamp: now + DAY_MS }),
      event("checkin-3", "daily_checkin", "profile", { timestamp: now + 2 * DAY_MS }),
    ],
    beforeStatus: "in_progress",
  },
  {
    taskId: "grow-portfolio-10k",
    partialEvents: [
      event("grow-400", "lend_deposited", "lend", { amountUsd: 400, marketId: "gho" }),
      event("grow-300", "borrow_opened", "borrow", { amountUsd: 300, marketId: "pool-a", timestamp: now + 1 }),
    ],
    completeEvents: [
      event("grow-400", "lend_deposited", "lend", { amountUsd: 400, marketId: "gho" }),
      event("grow-300", "borrow_opened", "borrow", { amountUsd: 300, marketId: "pool-a", timestamp: now + 1 }),
      event("grow-300b", "multiply_opened", "multiply", { amountUsd: 300, marketId: "eth-usdt", timestamp: now + 2 }),
    ],
    beforeStatus: "in_progress",
  },
  {
    taskId: "open-8-active-positions",
    partialEvents: [
      event("position-1", "lend_deposited", "lend", { amountUsd: 100, marketId: "gho" }),
      event("position-2", "borrow_opened", "borrow", { amountUsd: 100, marketId: "pool-a", timestamp: now + 1 }),
    ],
    completeEvents: [
      event("position-1", "lend_deposited", "lend", { amountUsd: 100, marketId: "gho" }),
      event("position-2", "borrow_opened", "borrow", { amountUsd: 100, marketId: "pool-a", timestamp: now + 1 }),
      event("position-3", "multiply_opened", "multiply", { amountUsd: 100, marketId: "eth-usdt", timestamp: now + 2 }),
    ],
    beforeStatus: "in_progress",
  },
  {
    taskId: "share-referral-link",
    completeEvents: [event("ref-link", "referral_link_created", "referral")],
  },
  {
    taskId: "invite-first-wallet",
    completeEvents: [event("ref-connect", "referral_connected", "referral", { referredWallet: "friend-1" })],
  },
  {
    taskId: "first-funded-referral",
    completeEvents: [
      event("ref-funded", "referral_funded", "referral", { referredWallet: "friend-1", amountUsd: 250 }),
    ],
  },
  {
    taskId: "bring-3-active-users",
    partialEvents: [
      event("ref-active-1", "referral_activated", "referral", { referredWallet: "friend-1" }),
      event("ref-active-2", "referral_activated", "referral", { referredWallet: "friend-2", timestamp: now + 1 }),
    ],
    completeEvents: [
      event("ref-active-1", "referral_activated", "referral", { referredWallet: "friend-1" }),
      event("ref-active-2", "referral_activated", "referral", { referredWallet: "friend-2", timestamp: now + 1 }),
      event("ref-active-3", "referral_activated", "referral", { referredWallet: "friend-3", timestamp: now + 2 }),
    ],
    beforeStatus: "in_progress",
  },
  {
    taskId: "bring-5-active-users",
    partialEvents: Array.from({ length: 4 }, (_, index) =>
      event(`ref-five-${index}`, "referral_activated", "referral", {
        referredWallet: `friend-five-${index}`,
        timestamp: now + index,
      }),
    ),
    completeEvents: Array.from({ length: 5 }, (_, index) =>
      event(`ref-five-${index}`, "referral_activated", "referral", {
        referredWallet: `friend-five-${index}`,
        timestamp: now + index,
      }),
    ),
    beforeStatus: "in_progress",
  },
  {
    taskId: "referral-cohort-25k",
    partialEvents: [
      event("ref-cohort-250", "referral_funded", "referral", { referredWallet: "friend-1", amountUsd: 250 }),
    ],
    completeEvents: [
      event("ref-cohort-250", "referral_funded", "referral", { referredWallet: "friend-1", amountUsd: 250 }),
      event("ref-cohort-250b", "referral_funded", "referral", {
        referredWallet: "friend-2",
        amountUsd: 250,
        timestamp: now + 1,
      }),
    ],
    beforeStatus: "in_progress",
  },
  {
    taskId: "referral-streak",
    partialEvents: [event("ref-streak-1", "referral_activated", "referral", { referredWallet: "friend-1" })],
    completeEvents: [
      event("ref-streak-1", "referral_activated", "referral", { referredWallet: "friend-1" }),
      event("ref-streak-2", "referral_activated", "referral", { referredWallet: "friend-2", timestamp: now + 1 }),
    ],
    beforeStatus: "in_progress",
  },
  {
    taskId: "avana-ambassador",
    partialEvents: Array.from({ length: 4 }, (_, index) =>
      event(`ref-amb-${index}`, "referral_activated", "referral", {
        referredWallet: `ambassador-${index}`,
        timestamp: now + index,
      }),
    ),
    completeEvents: Array.from({ length: 5 }, (_, index) =>
      event(`ref-amb-${index}`, "referral_activated", "referral", {
        referredWallet: `ambassador-${index}`,
        timestamp: now + index,
      }),
    ),
    beforeStatus: "in_progress",
  },
]

function evaluate(task: RewardTask, events: RewardActivityEvent[], evaluationNow: number, firstLoginAt = now) {
  return evaluateTaskProgress({
    task,
    wallet,
    events,
    claims: [],
    now: evaluationNow,
    firstLoginAt,
  })
}

describe("rewards task requirements", () => {
  it("keeps a requirement test for every live rewards task", () => {
    expect(taskSpecs).toHaveLength(35)
    expect(new Set(taskSpecs.map((spec) => spec.taskId)).size).toBe(35)
  })

  for (const spec of taskSpecs) {
    it(`tracks ${spec.taskId} exactly at its described threshold`, () => {
      const task = getTask(spec.taskId)

      if (task.requirement.type === "wait_since_login") {
        const beforeUnlock = evaluate(task, [], now + task.requirement.waitMs - 1)
        const atUnlock = evaluate(task, [], now + task.requirement.waitMs)

        expect(beforeUnlock.status).toBe(spec.beforeStatus ?? "in_progress")
        expect(atUnlock.status).toBe("claimable")
        expect(atUnlock.progress).toBe(1)
        expect(atUnlock.target).toBe(1)
        return
      }

      const partialEvents = spec.partialEvents ?? []
      const completeEvents = spec.completeEvents ?? buildSandboxCompletionEvents(task.id, wallet, now)

      if (partialEvents.length > 0) {
        const partial = evaluate(task, partialEvents, now + 5 * DAY_MS)
        expect(partial.status).toBe(spec.beforeStatus ?? "in_progress")
        expect(partial.progress).toBeLessThan(partial.target)
      } else {
        const empty = evaluate(task, [], now + 5 * DAY_MS)
        expect(empty.status).toBe("available")
      }

      const complete = evaluate(task, completeEvents, now + 5 * DAY_MS)
      expect(complete.status).toBe("claimable")
      expect(complete.progress).toBeGreaterThanOrEqual(complete.target)
    })
  }

  it("keeps reward totals and counts coherent after multi-quest claiming", () => {
    const tasks = buildDefaultRewardsCatalog(now)
    const events = [
      event("wallet", "wallet_connected", "profile"),
      event("profile", "profile_completed", "profile", { timestamp: now + 1 }),
      event("lend-200", "lend_deposited", "lend", { amountUsd: 200, marketId: "gho", timestamp: now + 2 }),
      event("lend-300", "lend_deposited", "lend", { amountUsd: 300, marketId: "gho", timestamp: now + 3 }),
      event("borrow-200", "borrow_opened", "borrow", { amountUsd: 200, marketId: "pool-a", timestamp: now + 4 }),
      event("claim-1", "reward_claimed", "rewards", { amountUsd: 25, timestamp: now + 5 }),
    ]
    const claims = [
      {
        claimId: "claim-connect",
        wallet,
        taskId: "connect-wallet",
        amount: 25,
        rewardSymbol: "AVA" as const,
        status: "confirmed" as const,
        syntheticTxHash: "tx-connect",
        claimedAt: now + 10,
      },
      {
        claimId: "claim-profile",
        wallet,
        taskId: "create-profile",
        amount: 20,
        rewardSymbol: "AVA" as const,
        status: "confirmed" as const,
        syntheticTxHash: "tx-profile",
        claimedAt: now + 11,
      },
    ]

    const summary = calculateRewardSummary({
      tasks,
      wallet,
      events,
      claims,
      now: now + 12,
      firstLoginAt: now,
    })

    expect(summary.totalClaimedAmount).toBe(45)
    expect(summary.totalClaimableAmount).toBe(340)
    expect(summary.totalEarnedAmount).toBe(385)
    expect(summary.completedTaskCount).toBe(7)
    expect(summary.claimableTaskCount).toBe(5)
  })

  it("does not count repeated activity in the same market as multiple open-position milestones", () => {
    const task = getTask("open-8-active-positions")
    const repeatedMarketEvents = [
      event("lend-repeat-1", "lend_deposited", "lend", { amountUsd: 100, marketId: "gho" }),
      event("lend-repeat-2", "lend_deposited", "lend", { amountUsd: 100, marketId: "gho", timestamp: now + 1 }),
      event("borrow-one", "borrow_opened", "borrow", { amountUsd: 100, marketId: "pool-a", timestamp: now + 2 }),
    ]
    const distinctMarketEvents = [
      event("lend-one", "lend_deposited", "lend", { amountUsd: 100, marketId: "gho" }),
      event("borrow-one", "borrow_opened", "borrow", { amountUsd: 100, marketId: "pool-a", timestamp: now + 1 }),
      event("multiply-one", "multiply_opened", "multiply", {
        amountUsd: 100,
        marketId: "eth-usdt",
        timestamp: now + 2,
      }),
    ]

    const repeated = evaluate(task, repeatedMarketEvents, now + DAY_MS)
    const distinct = evaluate(task, distinctMarketEvents, now + DAY_MS)

    expect(repeated.status).toBe("in_progress")
    expect(repeated.progress).toBe(2)
    expect(distinct.status).toBe("claimable")
    expect(distinct.progress).toBe(3)
  })
})
