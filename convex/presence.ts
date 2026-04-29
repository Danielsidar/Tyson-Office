import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const PRESENCE_TIMEOUT_MS = 15_000; // user is considered offline after 15s without heartbeat

// Join the office: insert or update the user's presence row
export const join = mutation({
  args: {
    sessionId: v.string(),
    name: v.string(),
    avatar: v.string(),
  },
  handler: async (ctx, { sessionId, name, avatar }) => {
    const now = Date.now();

    // First, clean up stale presence rows so freed cubicles can be reused
    const stale = await ctx.db
      .query("presence")
      .filter((q) => q.lt(q.field("lastSeen"), now - PRESENCE_TIMEOUT_MS))
      .collect();
    for (const row of stale) {
      await ctx.db.delete(row._id);
    }

    // Did we already have a row for this session? Update it.
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { name, avatar, lastSeen: now });
      return existing.cubicleIndex;
    }

    // Find first free cubicle index (0..n)
    const all = await ctx.db.query("presence").collect();
    const taken = new Set(all.map((p) => p.cubicleIndex));
    let cubicleIndex = 0;
    while (taken.has(cubicleIndex)) cubicleIndex++;

    await ctx.db.insert("presence", {
      sessionId,
      name,
      avatar,
      cubicleIndex,
      lastSeen: now,
    });

    return cubicleIndex;
  },
});

// Heartbeat - call regularly to keep presence alive
export const heartbeat = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { lastSeen: Date.now() });
    }
  },
});

// Leave the office (called on tab close)
export const leave = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }

    // Also clean up any pending knocks involving this session
    const fromKnocks = await ctx.db
      .query("knocks")
      .withIndex("by_from", (q) => q.eq("fromSessionId", sessionId))
      .collect();
    const toKnocks = await ctx.db
      .query("knocks")
      .withIndex("by_to", (q) => q.eq("toSessionId", sessionId))
      .collect();
    for (const k of [...fromKnocks, ...toKnocks]) {
      await ctx.db.delete(k._id);
    }
  },
});

// Mark user as in/out of a call
export const setInCall = mutation({
  args: {
    sessionId: v.string(),
    peerSessionId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, { sessionId, peerSessionId }) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        inCallWith: peerSessionId ?? undefined,
      });
    }
  },
});

// List all currently-online users (filters out stale rows)
export const list = query({
  handler: async (ctx) => {
    const now = Date.now();
    const rows = await ctx.db.query("presence").collect();
    return rows
      .filter((r) => now - r.lastSeen < PRESENCE_TIMEOUT_MS)
      .map((r) => ({
        sessionId: r.sessionId,
        name: r.name,
        avatar: r.avatar,
        cubicleIndex: r.cubicleIndex,
        inCallWith: r.inCallWith ?? null,
      }));
  },
});
