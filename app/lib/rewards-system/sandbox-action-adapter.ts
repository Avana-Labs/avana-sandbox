import { applyActivityEvent, buildDefaultRewardsCatalog, claimReward as buildClaimReward, evaluateAllTasksForUser } from "@/app/lib/rewards-engine"
import type {
  ReferralProfile,
  ReferralRelationship,
  RewardActivityEvent,
  RewardClaim,
  RewardTask,
} from "@/app/lib/rewards-engine"
import type { RewardsActionAdapter, RewardsSessionState } from "./contracts"

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

    state = applyActivityEvent(state, {
      id: `${wallet}:wallet_connected`,
      wallet,
      product: "profile",
      type: "wallet_connected",
      timestamp: this.now(),
    })
    state = applyActivityEvent(state, {
      id: `${wallet}:profile_completed`,
      wallet,
      product: "profile",
      type: "profile_completed",
      timestamp: this.now(),
    })

    state.referralProfiles = {
      ...state.referralProfiles,
      [wallet]: referralProfile,
    }

    this.writeState(state)
    return state
  }

  async recordActivityEvent(event: RewardActivityEvent) {
    const nextState = applyActivityEvent(this.readState(), event)
    this.updateState((currentState) => applyActivityEvent(currentState, event))
    return nextState
  }

  async refreshTaskProgress(wallet: string) {
    return evaluateAllTasksForUser({
      tasks: this.tasks,
      wallet,
      events: this.readState().events,
      claims: this.readState().claims,
      now: this.now(),
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
    }).find((entry) => entry.taskId === taskId)

    if (!progress) throw new Error(`Missing reward progress for task ${taskId}`)

    const { claim, event } = buildClaimReward({
      wallet,
      task,
      progress,
      now: this.now(),
    })

    const withClaim = {
      ...state,
      claims: [...state.claims, claim],
    }
    applyActivityEvent(withClaim, event)
    this.updateState((currentState) =>
      applyActivityEvent(
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

    state = applyActivityEvent(state, {
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
    state = applyActivityEvent(state, {
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
