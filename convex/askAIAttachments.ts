import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
const ALLOWED_MEDIA_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "image/png",
  "image/jpeg",
  "image/webp",
])

async function requireSubject(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity?.subject) throw new Error("Ask AI session required")
  return identity.subject
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
    if (!thread || thread.ownerSubject !== ownerSubject || thread.status !== "active") throw new Error("Thread not found")
    const metadata = await ctx.db.system.get(storageId)
    if (!metadata) throw new Error("Uploaded file not found")
    const mediaType = metadata.contentType ?? "application/octet-stream"
    if (!ALLOWED_MEDIA_TYPES.has(mediaType)) throw new Error("This file type is not supported")
    if (metadata.size > MAX_ATTACHMENT_BYTES) throw new Error("Attachments must be 10 MB or smaller")
    const cleanName = name.replace(/[\r\n]/g, " ").trim().slice(0, 160)
    if (!cleanName) throw new Error("Attachment name is required")
    const existing = await ctx.db
      .query("askAIAttachments")
      .withIndex("by_storage", (q) => q.eq("storageId", storageId))
      .unique()
    if (existing) {
      if (existing.ownerSubject !== ownerSubject || existing.threadId !== threadId) throw new Error("Attachment not found")
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
    const thread = await ctx.db.query("askAIThreads").withIndex("by_thread", (q) => q.eq("threadId", threadId)).unique()
    if (!thread || thread.ownerSubject !== ownerSubject) throw new Error("Thread not found")
    return ctx.db.query("askAIAttachments").withIndex("by_thread", (q) => q.eq("threadId", threadId)).collect()
  },
})

export const remove = mutation({
  args: { attachmentId: v.id("askAIAttachments") },
  handler: async (ctx, { attachmentId }) => {
    const ownerSubject = await requireSubject(ctx)
    const attachment = await ctx.db.get(attachmentId)
    if (!attachment || attachment.ownerSubject !== ownerSubject) throw new Error("Attachment not found")
    await ctx.storage.delete(attachment.storageId)
    await ctx.db.delete(attachmentId)
  },
})
