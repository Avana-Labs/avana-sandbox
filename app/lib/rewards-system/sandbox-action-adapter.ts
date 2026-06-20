import { applyActivityEvent, buildDefaultRewardsCatalog, claimReward as buildClaimReward, evaluateAllTasksForUser } from "@/app/lib/rewards-engine"
import { buildSandboxCompletionEvents } from "@/app/lib/rewards-engine/task-completion"
import type {
  ReferralProfile,
  ReferralRelationship,
  RewardActivityEvent,
  RewardClaim,
  RewardTask,
} from "@/app/lib/rewards-engine"
import type { RewardsActionAdapter, RewardsSessionState } from "./contracts"

function applyActivityEventToSession(state: RewardsSessionState, event: RewardActivityEvent): RewardsSessionState {
  const nextEngineState = applyActivityEvent(
    { events: state.events, claims: state.claims },
    event,
  )

  return {
    ...state,
    events: nextEngineState.events,
    claims: nextEngineState.claims,
  }
}

type SandboxRewardsActionAdapterOptions = {
  readState: () => RewardsSessionState
  writeState: (nextState: RewardsSessionState | ((currentState: RewardsSessionState) => RewardsSessionState)) => void
  now?: () => number
  tasks?: RewardTask[]
}

function buildReferralCode(wallet: string) {
  return `AVA-${wallet.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}`
}

export class SandboxRewardsActionAdapter implements RewardsActionAdapter {
  readonly mode = "sandbox" as const
  private readonly now: () => number
  private readonly tasks: RewardTask[]

  constructor(private readonly options: SandboxRewardsActionAdapterOptions) {
    this.now = options.now ?? Date.now
    this.tasks = options.tasks ?? buildDefaultRewardsCatalog(this.now())
  }

  private readState() {
    return this.options.readState()
  }

  private writeState(state: RewardsSessionState) {
    this.options.writeState(state)
  }

  private updateState(updater: (currentState: RewardsSessionState) => RewardsSessionState) {
    this.options.writeState(updater)
  }

  private ensureReferralProfile(state: RewardsSessionState, wallet: string): [RewardsSessionState, ReferralProfile] {
    const existing = state.referralProfiles[wallet]
    if (existing) return [state, existing]

    const referralProfile: ReferralProfile = {
      wallet,
      referralCode: buildReferralCode(wallet),
      referralLink: `https://avana.cc/rewards?ref=${buildReferralCode(wallet)}`,
      activeReferralCount: 0,
      fundedReferralCount: 0,
      referralVolumeUsd: 0,
      createdAt: this.now(),
    }

    const nextState = {
      ...state,
      referralProfiles: {
        ...state.referralProfiles,
        [wallet]: referralProfile,
      },
    }

    return [nextState, referralProfile]
  }

  async initializeRewardsForWallet(wallet: string) {
    const initialized = this.ensureReferralProfile(this.readState(), wallet)
    let state = initialized[0]
    const referralProfile = initialized[1]
    const loginAt = this.now()

    if (!state.firstLoginAt) {
      state = { ...state, firstLoginAt: loginAt }
    }

    state = applyActivityEventToSession(state, {
      id: `${wallet}:wallet_connected`,
      wallet,
      product: "profile",
      type: "wallet_connected",
      timestamp: loginAt,
    })
    state = applyActivityEventToSession(state, {
      id: `${wallet}:profile_completed`,
      wallet,
      product: "profile",
      type: "profile_completed",
      timestamp: loginAt + 1,
    })

    state.referralProfiles = {
      ...state.referralProfiles,
      [wallet]: referralProfile,
    }

    this.writeState(state)
    return state
  }

  async recordActivityEvent(event: RewardActivityEvent) {
    const nextState = applyActivityEventToSession(this.readState(), event)
    this.updateState((currentState) => applyActivityEventToSession(currentState, event))
    return nextState
  }

  async completeSandboxTask(wallet: string, taskId: string) {
    const events = buildSandboxCompletionEvents(taskId, wallet, this.now())
    if (events.length === 0) {
      throw new Error(`No sandbox completion path for reward task ${taskId}`)
    }

    let state = this.readState()
    for (const event of events) {
      state = applyActivityEventToSession(state, event)
    }

    this.writeState(state)
    return state
  }

  async completeEducation(wallet: string) {
    return this.recordActivityEvent({
      id: `${wallet}:education_completed`,
      wallet,
      product: "education",
      type: "education_completed",
      timestamp: this.now(),
    })
  }

  async favoriteMarket(wallet: string, marketId: string) {
    const state = this.readState()
    const nextFavorites = state.favoriteMarketIds.includes(marketId)
      ? state.favoriteMarketIds
      : [...state.favoriteMarketIds, marketId]

    this.writeState({ ...state, favoriteMarketIds: nextFavorites })
    return this.recordActivityEvent({
      id: `${wallet}:favorite:${marketId}`,
      wallet,
      product: "profile",
      type: "market_favorited",
      marketId,
      timestamp: this.now(),
    })
  }

  async recordSimulation(wallet: string, product: "borrow" | "lend" | "multiply") {
    return this.recordActivityEvent({
      id: `${wallet}:simulation:${product}:${this.now()}`,
      wallet,
      product,
      type: "simulation_created",
      timestamp: this.now(),
    })
  }

  async recordSandboxTour(wallet: string, taskId: string) {
    const state = this.readState()
    const existingTours = state.events.filter(
      (event) => event.wallet === wallet && event.type === "sandbox_tour_completed",
    ).length
    const marketId =
      taskId === "use-curve-position"
        ? "curve-sandbox-tour"
        : taskId === "use-uniswap-v4-position"
          ? "uniswap-v4-sandbox-tour"
          : `market-tour-${existingTours + 1}`

    return this.recordActivityEvent({
      id: `${wallet}:tour:${marketId}`,
      wallet,
      product: "borrow",
      type: "sandbox_tour_completed",
      marketId,
      timestamp: this.now(),
    })
  }

  async recordDailyCheckin(wallet: string) {
    const day = Math.floor(this.now() / (24 * 60 * 60 * 1000))
    return this.recordActivityEvent({
      id: `${wallet}:checkin:${day}`,
      wallet,
      product: "profile",
      type: "daily_checkin",
      timestamp: this.now(),
    })
  }

  async runReferralSandboxStep(wallet: string, step: "invite" | "activate" | "fund") {
    let state = this.readState()
    const index = state.relationships.length
    const referredWallet = `${wallet}-crew-${index}`

    if (step === "invite") {
      await this.createReferralCode(wallet)
      state = this.readState()
      state = applyActivityEventToSession(state, {
        id: `${wallet}:referral_connected:${referredWallet}`,
        wallet,
        product: "referral",
        type: "referral_connected",
        referredWallet,
        timestamp: this.now(),
      })
      state = {
        ...state,
        relationships: [
          ...state.relationships,
          { referrerWallet: wallet, referredWallet, createdAt: this.now() },
        ],
      }
      this.writeState(state)
      return state
    }

    if (step === "activate") {
      const activatedCount = state.events.filter(
        (event) => event.wallet === wallet && event.type === "referral_activated",
      ).length
      const referredWallet = `${wallet}-crew-${activatedCount}`
      state = applyActivityEventToSession(state, {
        id: `${wallet}:referral_activated:${referredWallet}`,
        wallet,
        product: "referral",
        type: "referral_activated",
        referredWallet,
        timestamp: this.now(),
      })
      this.writeState(state)
      return state
    }

    const fundedCount = state.events.filter((event) => event.wallet === wallet && event.type === "referral_funded").length
    const fundedWallet = `${wallet}-crew-${fundedCount}`
    state = applyActivityEventToSession(state, {
      id: `${wallet}:referral_funded:${fundedWallet}`,
      wallet,
      product: "referral",
      type: "referral_funded",
      referredWallet: fundedWallet,
      amountUsd: 250,
      timestamp: this.now(),
    })
    this.writeState(state)
    return state
  }

  async refreshTaskProgress(wallet: string) {
    const state = this.readState()
    return evaluateAllTasksForUser({
      tasks: this.tasks,
      wallet,
      events: state.events,
      claims: state.claims,
      now: this.now(),
      firstLoginAt: state.firstLoginAt,
    })
  }

  async claimReward(wallet: string, taskId: string) {
    const state = this.readState()
    const task = this.tasks.find((entry) => entry.id === taskId)
    if (!task) throw new Error(`Unknown reward task ${taskId}`)

    const progress = evaluateAllTasksForUser({
      tasks: this.tasks,
      wallet,
      events: state.events,
      claims: state.claims,
      now: this.now(),
      firstLoginAt: state.firstLoginAt,
    }).find((entry) => entry.taskId === taskId)

    if (!progress) throw new Error(`Missing reward progress for task ${taskId}`)

    const { claim, event } = buildClaimReward({
      wallet,
      task,
      progress,
      now: this.now(),
    })

    this.updateState((currentState) =>
      applyActivityEventToSession(
        {
          ...currentState,
          claims: [...currentState.claims, claim],
        },
        event,
      ),
    )
    return claim
  }

  async claimAllRewards(wallet: string) {
    const progress = await this.refreshTaskProgress(wallet)
    const claimableIds = progress.filter((entry) => entry.status === "claimable").map((entry) => entry.taskId)
    const claims: RewardClaim[] = []

    for (const taskId of claimableIds) {
      claims.push(await this.claimReward(wallet, taskId))
    }

    return claims
  }

  async createReferralCode(wallet: string) {
    const initialized = this.ensureReferralProfile(this.readState(), wallet)
    let state = initialized[0]
    const profile = initialized[1]

    state = applyActivityEventToSession(state, {
      id: `${wallet}:referral_link_created`,
      wallet,
      product: "referral",
      type: "referral_link_created",
      timestamp: this.now(),
    })
    this.writeState(state)
    return profile
  }

  async applyReferralCode(wallet: string, referralCode: string) {
    let state = this.readState()
    const referrerProfile = Object.values(state.referralProfiles).find((profile) => profile.referralCode === referralCode)
    if (!referrerProfile) throw new Error(`Unknown referral code ${referralCode}`)
    if (referrerProfile.wallet === wallet) throw new Error("Wallet cannot refer itself")

    const existing = state.relationships.find((relationship) => relationship.referredWallet === wallet)
    if (existing) return existing

    const relationship: ReferralRelationship = {
      referrerWallet: referrerProfile.wallet,
      referredWallet: wallet,
      createdAt: this.now(),
    }

    state = {
      ...state,
      relationships: [...state.relationships, relationship],
      referralProfiles: {
        ...state.referralProfiles,
        [referrerProfile.wallet]: {
          ...referrerProfile,
          activeReferralCount: referrerProfile.activeReferralCount + 1,
        },
      },
    }
    state = applyActivityEventToSession(state, {
      id: `${referrerProfile.wallet}:referral_connected:${wallet}`,
      wallet: referrerProfile.wallet,
      product: "referral",
      type: "referral_connected",
      referredWallet: wallet,
      timestamp: this.now(),
    })

    this.writeState(state)
    return relationship
  }
}
