import { storeFile } from "@convex-dev/agent"
import { v } from "convex/values"
import { components, internal } from "./_generated/api"
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server"
import { askAIMediaRateLimiter } from "./askAIMediaRateLimiter"

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
/** Processed attachments older than this are purged by `purgeExpiredAttachments`. */
const ATTACHMENT_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000
const ALLOWED_MEDIA_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
])

async function requireSubject(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity?.subject) throw new Error("Ask AI session required")
  return identity.subject
}

/** Delete a storage object, tolerating an already-removed object (e.g. deduped on process). */
async function safeDeleteStorage(ctx: { storage: { delete: (id: string) => Promise<void> } }, storageId: string) {
  try {
    await ctx.storage.delete(storageId)
  } catch {
    // Object was already removed (dedup on process, or a prior partial delete). Ignore.
  }
}

const startsWith = (bytes: Uint8Array, signature: number[]) => signature.every((byte, index) => bytes[index] === byte)

/**
 * Content-sniffing validation: verify the real magic bytes of the stored blob
 * match the client-declared media type. Guards against a caller lying in
 * `metadata.contentType` to smuggle an unexpected payload past the allowlist.
 *
 * @param mediaType declared (already allowlisted) media type
 * @param header    leading bytes of the blob (>= 16 bytes recommended)
 * @param text      decoded contents, required for text/json validation
 */
export function declaredTypeMatchesContent(mediaType: string, header: Uint8Array, text: string | undefined): boolean {
  switch (mediaType) {
    case "image/png":
      return startsWith(header, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    case "image/jpeg":
      return startsWith(header, [0xff, 0xd8, 0xff])
    case "image/gif":
      // "GIF87a" or "GIF89a"
      return (
        startsWith(header, [0x47, 0x49, 0x46, 0x38]) && (header[4] === 0x37 || header[4] === 0x39) && header[5] === 0x61
      )
    case "image/webp":
      // "RIFF" .... "WEBP"
      return (
        startsWith(header, [0x52, 0x49, 0x46, 0x46]) &&
        header[8] === 0x57 &&
        header[9] === 0x45 &&
        header[10] === 0x42 &&
        header[11] === 0x50
      )
    case "application/pdf":
      return startsWith(header, [0x25, 0x50, 0x44, 0x46, 0x2d]) // "%PDF-"
    case "application/json":
      if (text === undefined) return false
      try {
        JSON.parse(text)
        return true
      } catch {
        return false
      }
    case "text/plain":
    case "text/markdown":
    case "text/csv":
      // Treat as text by content: reject binary payloads (NUL byte) masquerading as text.
      return text !== undefined && !text.includes("\u0000")
    default:
      // Non-sniffable allowlisted types (e.g. audio/*) are validated elsewhere.
      return true
  }
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireSubject(ctx)
    return ctx.storage.generateUploadUrl()
  },
})

export const register = mutation({
  args: { threadId: v.string(), storageId: v.id("_storage"), name: v.string() },
  handler: async (ctx, { threadId, storageId, name }) => {
    const ownerSubject = await requireSubject(ctx)
    const thread = await ctx.db
      .query("askAIThreads")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .unique()
    if (!thread || thread.ownerSubject !== ownerSubject || thread.status !== "active")
      throw new Error("Thread not found")
    const metadata = await ctx.db.system.get(storageId)
    if (!metadata) throw new Error("Uploaded file not found")
    const mediaType = metadata.contentType ?? "application/octet-stream"
    if (!ALLOWED_MEDIA_TYPES.has(mediaType)) throw new Error("This file type is not supported")
    if (metadata.size > MAX_ATTACHMENT_BYTES) throw new Error("Attachments must be 10 MB or smaller")
    const cleanName = name
      .replace(/[\r\n]/g, " ")
      .trim()
      .slice(0, 160)
    if (!cleanName) throw new Error("Attachment name is required")
    const existing = await ctx.db
      .query("askAIAttachments")
      .withIndex("by_storage", (q) => q.eq("storageId", storageId))
      .unique()
    if (existing) {
      if (existing.ownerSubject !== ownerSubject || existing.threadId !== threadId)
        throw new Error("Attachment not found")
      return existing._id
    }
    const now = Date.now()
    return ctx.db.insert("askAIAttachments", {
      ownerSubject,
      threadId,
      storageId,
      name: cleanName,
      mediaType,
      size: metadata.size,
      status: "uploaded",
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const list = query({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const ownerSubject = await requireSubject(ctx)
    const thread = await ctx.db
      .query("askAIThreads")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .unique()
    if (!thread || thread.ownerSubject !== ownerSubject) throw new Error("Thread not found")
    return ctx.db
      .query("askAIAttachments")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .collect()
  },
})

export const remove = mutation({
  args: { attachmentId: v.id("askAIAttachments") },
  handler: async (ctx, { attachmentId }) => {
    const ownerSubject = await requireSubject(ctx)
    const attachment = await ctx.db.get(attachmentId)
    if (!attachment || attachment.ownerSubject !== ownerSubject) throw new Error("Attachment not found")
    await safeDeleteStorage(ctx, attachment.storageId)
    await ctx.db.delete(attachmentId)
  },
})

export const getForProcessing = internalQuery({
  args: { attachmentId: v.id("askAIAttachments") },
  handler: async (ctx, { attachmentId }) => {
    const ownerSubject = await requireSubject(ctx)
    const attachment = await ctx.db.get(attachmentId)
    if (!attachment || attachment.ownerSubject !== ownerSubject) throw new Error("Attachment not found")
    return attachment
  },
})

export const markProcessed = internalMutation({
  args: {
    attachmentId: v.id("askAIAttachments"),
    agentFileId: v.optional(v.string()),
    extractedText: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { attachmentId, agentFileId, extractedText, error }) => {
    const ownerSubject = await requireSubject(ctx)
    const attachment = await ctx.db.get(attachmentId)
    if (!attachment || attachment.ownerSubject !== ownerSubject) throw new Error("Attachment not found")
    await ctx.db.patch(attachmentId, {
      agentFileId,
      extractedText,
      error,
      status: error ? "failed" : "processed",
      updatedAt: Date.now(),
    })
  },
})

export const deleteProcessedUpload = internalMutation({
  args: { attachmentId: v.id("askAIAttachments") },
  handler: async (ctx, { attachmentId }) => {
    const ownerSubject = await requireSubject(ctx)
    const attachment = await ctx.db.get(attachmentId)
    if (!attachment || attachment.ownerSubject !== ownerSubject) throw new Error("Attachment not found")
    await safeDeleteStorage(ctx, attachment.storageId)
    await ctx.db.delete(attachmentId)
  },
})

/**
 * Retention purge: delete processed/failed attachments older than the retention
 * window along with any remaining storage objects. Wire this into a cron in
 * another lane — the schedulable reference is `internal.askAIAttachments.purgeExpiredAttachments`.
 */
export const purgeExpiredAttachments = internalMutation({
  args: { now: v.optional(v.number()) },
  handler: async (ctx, { now }) => {
    const cutoff = (now ?? Date.now()) - ATTACHMENT_RETENTION_MS
    const expired = await ctx.db
      .query("askAIAttachments")
      .filter((q) => q.and(q.neq(q.field("status"), "uploaded"), q.lt(q.field("createdAt"), cutoff)))
      .collect()
    for (const attachment of expired) {
      await safeDeleteStorage(ctx, attachment.storageId)
      await ctx.db.delete(attachment._id)
    }
    return { deleted: expired.length }
  },
})

export const process = action({
  args: { attachmentId: v.id("askAIAttachments") },
  handler: async (ctx, { attachmentId }): Promise<{ status: "processed"; agentFileId: string }> => {
    const subject = await requireSubject(ctx)
    await askAIMediaRateLimiter.limit(ctx, "attachmentProcess", { key: subject, throws: true })
    const attachment = await ctx.runQuery(internal.askAIAttachments.getForProcessing, { attachmentId })
    try {
      const url = await ctx.storage.getUrl(attachment.storageId)
      if (!url) throw new Error("Uploaded file not found")
      const response = await fetch(url)
      if (!response.ok) throw new Error("Uploaded file could not be read")
      const blob = await response.blob()
      const header = new Uint8Array(await blob.slice(0, 16).arrayBuffer())
      const isTextual = attachment.mediaType.startsWith("text/") || attachment.mediaType === "application/json"
      const textContent = isTextual ? await blob.text() : undefined
      if (!declaredTypeMatchesContent(attachment.mediaType, header, textContent))
        throw new Error("File content does not match its declared type")
      const stored = await storeFile(ctx, components.agent, blob, { filename: attachment.name })
      const extractedText = textContent?.slice(0, 100_000)
      await ctx.runMutation(internal.askAIAttachments.markProcessed, {
        attachmentId,
        agentFileId: stored.file.fileId,
        extractedText,
      })
      // Dedup: the agent now holds its own copy, so drop the original upload blob.
      await safeDeleteStorage(ctx, attachment.storageId)
      return { status: "processed", agentFileId: stored.file.fileId }
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : "Attachment processing failed"
      await ctx.runMutation(internal.askAIAttachments.markProcessed, { attachmentId, error: message })
      throw error
    }
  },
})
