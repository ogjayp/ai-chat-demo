import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const userValidator = v.object({
  name: v.string(),
  email: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  // Clerk user id — matches ctx.auth.getUserIdentity().subject
  externalId: v.string(),
});

export const conversationValidator = v.object({
  userId: v.id("users"),
  title: v.string(),
});

export const messageValidator = v.object({
  conversationId: v.id("conversations"),
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
});

export default defineSchema({
  users: defineTable(userValidator).index("by_externalId", ["externalId"]),
  conversations: defineTable(conversationValidator).index("by_userId", [
    "userId",
  ]),
  messages: defineTable(messageValidator).index("by_conversationId", [
    "conversationId",
  ]),
});
