import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Send a WebRTC signaling message (offer / answer / ICE / hangup)
export const send = mutation({
  args: {
    fromSessionId: v.string(),
    toSessionId: v.string(),
    type: v.union(
      v.literal("offer"),
      v.literal("answer"),
      v.literal("ice"),
      v.literal("hangup")
    ),
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("signals", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Subscribe to incoming signals for this session
export const incoming = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const rows = await ctx.db
      .query("signals")
      .withIndex("by_to", (q) => q.eq("toSessionId", sessionId))
      .collect();
    return rows.sort((a, b) => a.createdAt - b.createdAt);
  },
});

// Delete a signal once it's been processed (so the same one isn't reapplied).
// Idempotent: if it's already gone (e.g. Strict Mode double-fire), do nothing.
export const consume = mutation({
  args: { signalId: v.id("signals") },
  handler: async (ctx, { signalId }) => {
    const doc = await ctx.db.get(signalId);
    if (doc) await ctx.db.delete(signalId);
  },
});

// Clear all signals between two sessions (call after hangup)
export const clearBetween = mutation({
  args: {
    sessionA: v.string(),
    sessionB: v.string(),
  },
  handler: async (ctx, { sessionA, sessionB }) => {
    const rows = await ctx.db.query("signals").collect();
    for (const r of rows) {
      if (
        (r.fromSessionId === sessionA && r.toSessionId === sessionB) ||
        (r.fromSessionId === sessionB && r.toSessionId === sessionA)
      ) {
        await ctx.db.delete(r._id);
      }
    }
  },
});
