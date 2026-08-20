import { RateLimiter } from "@convex-dev/rate-limiter"
import { components } from "./_generated/api"

const HOUR = 60 * 60 * 1_000

/**
 * Throttle for the paid media endpoints (attachment processing + voice
 * transcription). These public actions hit OpenAI / agent-file storage per
 * call, so they are rate limited per authenticated subject independently of the
 * chat-turn limiter in `askAI.ts`. Token buckets allow a small burst and then
 * refill steadily.
 */
export const askAIMediaRateLimiter = new RateLimiter(components.rateLimiter, {
  attachmentProcess: { kind: "token bucket", rate: 30, period: HOUR, capacity: 5 },
  voiceTranscription: { kind: "token bucket", rate: 30, period: HOUR, capacity: 5 },
})
