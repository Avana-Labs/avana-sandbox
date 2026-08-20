import { createOpenAI } from "@ai-sdk/openai"
import { transcribe } from "ai"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import { action } from "./_generated/server"

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const transcribeRecording = action({
  args: { attachmentId: v.id("askAIAttachments") },
  handler: async (ctx, { attachmentId }): Promise<{ text: string }> => {
    if (!process.env.OPENAI_API_KEY) throw new Error("Voice transcription is not configured")
    const attachment = await ctx.runQuery(internal.askAIAttachments.getForProcessing, { attachmentId })
    if (!attachment.mediaType.startsWith("audio/")) throw new Error("Voice recording is not an audio file")
    const url = await ctx.storage.getUrl(attachment.storageId)
    if (!url) throw new Error("Voice recording not found")
    const result = await transcribe({
      model: openai.transcription(process.env.ASK_AI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe"),
      audio: new URL(url),
      maxRetries: 2,
    })
    await ctx.runMutation(internal.askAIAttachments.deleteProcessedUpload, { attachmentId })
    const text = result.text.trim()
    if (!text) throw new Error("No speech was detected")
    return { text }
  },
})
