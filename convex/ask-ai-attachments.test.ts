// @vitest-environment edge-runtime
import { register as registerAgent } from "@convex-dev/agent/test"
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import { declaredTypeMatchesContent } from "./askAIAttachments"
import { api } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.*s")

const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(16 - values.length).fill(0)])

describe("Ask AI attachment MIME signature validation", () => {
  test("accepts payloads whose magic bytes match the declared type", () => {
    expect(
      declaredTypeMatchesContent("image/png", bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), undefined),
    ).toBe(true)
    expect(declaredTypeMatchesContent("image/jpeg", bytes(0xff, 0xd8, 0xff, 0xe0), undefined)).toBe(true)
    expect(declaredTypeMatchesContent("image/gif", bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61), undefined)).toBe(true)
    expect(
      declaredTypeMatchesContent(
        "image/webp",
        bytes(0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50),
        undefined,
      ),
    ).toBe(true)
    expect(declaredTypeMatchesContent("application/pdf", bytes(0x25, 0x50, 0x44, 0x46, 0x2d), undefined)).toBe(true)
    expect(declaredTypeMatchesContent("application/json", new Uint8Array(), '{"ok":true}')).toBe(true)
    expect(declaredTypeMatchesContent("text/plain", new Uint8Array(), "hello world")).toBe(true)
  })

  test("rejects a payload whose real signature contradicts the declared type", () => {
    // PDF bytes smuggled in while claiming to be a PNG image.
    expect(declaredTypeMatchesContent("image/png", bytes(0x25, 0x50, 0x44, 0x46, 0x2d), undefined)).toBe(false)
    // A JPEG header claiming to be a PDF.
    expect(declaredTypeMatchesContent("application/pdf", bytes(0xff, 0xd8, 0xff), undefined)).toBe(false)
    // Malformed JSON.
    expect(declaredTypeMatchesContent("application/json", new Uint8Array(), "{not json")).toBe(false)
    // Binary payload (NUL byte) masquerading as text.
    expect(declaredTypeMatchesContent("text/plain", new Uint8Array(), "abc\u0000def")).toBe(false)
  })
})

describe("Ask AI attachment storage", () => {
  test("requires a session before issuing an upload URL", async () => {
    const t = convexTest(schema, modules)
    await expect(t.mutation(api.askAIAttachments.generateUploadUrl, {})).rejects.toThrow("Ask AI session required")
  })

  test("does not expose another subject's attachment list", async () => {
    const t = convexTest(schema, modules)
    registerAgent(t)
    const owner = t.withIdentity({ subject: "ask-guest:attachment-owner" })
    const other = t.withIdentity({ subject: "ask-guest:attachment-other" })
    const thread = await owner.mutation(api.askAI.create, {})
    await expect(other.query(api.askAIAttachments.list, { threadId: thread.threadId })).rejects.toThrow(
      "Thread not found",
    )
  })
})
