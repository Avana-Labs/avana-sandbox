import type { StreamTextTransform, TextStreamPart, ToolSet } from "ai"

const EMOJI_PATTERN = /[\p{Extended_Pictographic}\p{Emoji_Presentation}]\uFE0F?/gu
const OPT_IN_ENDING = /^(?:want me to|would you like me to|do you want me to|should i|i can also)\b/i
const FOLLOW_UP_QUESTION =
  /^(?:what can i help|how can i help|is there anything else|anything else|what would you like|what do you want|need anything else)\b.*\?$/i

export function enforceAskAIOutputPolicy(text: string): string {
  const withoutEmoji = text.replace(EMOJI_PATTERN, "").replace(/\uFE0F/g, "")
  const withoutDashPunctuation = withoutEmoji.replace(/\s+-\s+/g, ", ").replace(/[–—]/g, ", ")
  const normalized = withoutDashPunctuation
    .replace(/\s+,\s*/g, ", ")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
  return OPT_IN_ENDING.test(normalized) || FOLLOW_UP_QUESTION.test(normalized) ? "" : normalized
}

export function createAskAIOutputTransform<TOOLS extends ToolSet>(): StreamTextTransform<TOOLS> {
  return () => {
    const pending = new Map<string, string>()
    return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      transform(chunk, controller) {
        if (chunk.type === "text-delta") {
          const buffered = (pending.get(chunk.id) ?? "") + chunk.text
          const boundaries = [...buffered.matchAll(/[.!?]\s+(?=\S)/g)]
          const boundary = boundaries.at(-1)
          if (!boundary || boundary.index === undefined) {
            pending.set(chunk.id, buffered)
            return
          }
          const end = boundary.index + boundary[0].length
          const ready = enforceAskAIOutputPolicy(buffered.slice(0, end))
          pending.set(chunk.id, buffered.slice(end))
          if (ready) controller.enqueue({ ...chunk, text: `${ready} ` })
          return
        }
        if (chunk.type === "text-end") {
          const ready = enforceAskAIOutputPolicy(pending.get(chunk.id) ?? "")
          pending.delete(chunk.id)
          if (ready) controller.enqueue({ type: "text-delta", id: chunk.id, text: ready })
        }
        controller.enqueue(chunk)
      },
    })
  }
}
