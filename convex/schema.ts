import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const userValidator = v.object({
  name: v.string(),
  email: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  // Clerk user id — matches ctx.auth.getUserIdentity().subject
  externalId: v.string(),
});

export default defineSchema({
  users: defineTable(userValidator).index("by_externalId", ["externalId"]),
});
