import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Active users in the office (presence)
  presence: defineTable({
    sessionId: v.string(), // unique per browser tab
    name: v.string(),
    avatar: v.string(), // emoji or color
    cubicleIndex: v.number(), // which seat they took
    lastSeen: v.number(), // ms timestamp - used to expire stale users
    inCallWith: v.optional(v.string()), // sessionId of peer if in a call
  })
    .index("by_session", ["sessionId"])
    .index("by_cubicle", ["cubicleIndex"]),

  // Knock-on-door requests
  knocks: defineTable({
    fromSessionId: v.string(),
    fromName: v.string(),
    toSessionId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined")
    ),
    createdAt: v.number(),
  })
    .index("by_to", ["toSessionId"])
    .index("by_from", ["fromSessionId"]),

  // WebRTC signaling messages between peers
  signals: defineTable({
    fromSessionId: v.string(),
    toSessionId: v.string(),
    type: v.union(
      v.literal("offer"),
      v.literal("answer"),
      v.literal("ice"),
      v.literal("hangup")
    ),
    payload: v.string(), // JSON string of SDP / ICE candidate
    createdAt: v.number(),
  }).index("by_to", ["toSessionId"]),
});
