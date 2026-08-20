import type { AskAIChatMessage } from "./chat-protocol"
import { classifyAskAIDomain, type DomainResult } from "./domain-gate"

export function fallbackAskAIRoute(prompt: string, messages: AskAIChatMessage[]): DomainResult {
  const route = classifyAskAIDomain(prompt)
  if (!route.allowed || route.confidence !== 0.5) return route

  const previousUserMessage = messages.findLast((message) => message.role === "user" && message.text.trim())
  if (!previousUserMessage) return route
  const previousRoute = classifyAskAIDomain(previousUserMessage.text)
  return previousRoute.allowed && previousRoute.confidence > 0.5 ? { ...previousRoute, confidence: 0.7 } : route
}
