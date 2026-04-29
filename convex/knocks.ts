import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const KNOCK_TIMEOUT_MS = 30_000; // a pending knock auto-cancels after 30s

// Send a knock from one session to another
export const knock = mutation({
  args: {
    fromSessionId: v.string(),
    fromName: v.string(),
    toSessionId: v.string(),
  },
  handler: async (ctx, { fromSessionId, fromName, toSessionId }) => {
    const now = Date.now();

    // Clear any existing pending knock between these two (avoid spam)
    const existing = await ctx.db
      .query("knocks")
      .withIndex("by_to", (q) => q.eq("toSessionId", toSessionId))
      .filter((q) => q.eq(q.field("fromSessionId"), fromSessionId))
      .collect();
    for (const k of existing) {
      await ctx.db.delete(k._id);
    }

    return await ctx.db.insert("knocks", {
      fromSessionId,
      fromName,
      toSessionId,
      status: "pending",
      createdAt: now,
    });
  },
});

// Respond to a knock (accept or decline)
export const respond = mutation({
  args: {
    knockId: v.id("knocks"),
    accept: v.boolean(),
  },
  handler: async (ctx, { knockId, accept }) => {
    const k = await ctx.db.get(knockId);
    if (!k) return;
    await ctx.db.patch(knockId, {
      status: accept ? "accepted" : "declined",
    });
  },
});

// List incoming pending knocks for a session
export const incoming = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const now = Date.now();
    const rows = await ctx.db
      .query("knocks")
      .withIndex("by_to", (q) => q.eq("toSessionId", sessionId))
      .collect();
    return rows.filter(
      (r) => r.status === "pending" && now - r.createdAt < KNOCK_TIMEOUT_MS
    );
  },
});

// Watch the response to a knock you sent
export const outgoing = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const rows = await ctx.db
      .query("knocks")
      .withIndex("by_from", (q) => q.eq("fromSessionId", sessionId))
      .collect();
    // Sort newest first and return top 5 - the client is interested in latest answer
    return rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  },
});

// Cleanup helper: delete a specific knock (call once it's handled by both sides).
// Idempotent: safe to call twice.
export const remove = mutation({
  args: { knockId: v.id("knocks") },
  handler: async (ctx, { knockId }) => {
    const doc = await ctx.db.get(knockId);
    if (doc) await ctx.db.delete(knockId);
  },
});
