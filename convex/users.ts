import { v } from "convex/values";
import { userValidator } from "./schema";
import {
  internalMutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

const userDocValidator = userValidator.extend({
  _id: v.id("users"),
  _creationTime: v.number(),
});

export const current = query({
  args: {},
  returns: v.union(userDocValidator, v.null()),
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const upsertFromClerk = internalMutation({
  args: userValidator.fields,
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const existing = await userByExternalId(ctx, args.externalId);
    const attributes = {
      name: args.name,
      externalId: args.externalId,
      ...(args.email !== undefined ? { email: args.email } : {}),
      ...(args.imageUrl !== undefined ? { imageUrl: args.imageUrl } : {}),
    };

    if (existing === null) {
      return await ctx.db.insert("users", attributes);
    }

    await ctx.db.patch("users", existing._id, attributes);
    return existing._id;
  },
});

export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  returns: v.null(),
  handler: async (ctx, { clerkUserId }) => {
    const user = await userByExternalId(ctx, clerkUserId);
    if (user === null) {
      console.warn(
        `Can't delete user, there is none for Clerk user ID: ${clerkUserId}`,
      );
      return null;
    }

    await ctx.db.delete("users", user._id);
    return null;
  },
});

export async function getOrCreateCurrentUser(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("Not authenticated");
  }

  const existing = await userByExternalId(ctx, identity.subject);
  if (existing !== null) {
    return existing;
  }

  const name =
    identity.name?.trim() ||
    [identity.givenName, identity.familyName].filter(Boolean).join(" ").trim() ||
    identity.email ||
    "Anonymous";

  const userId = await ctx.db.insert("users", {
    name,
    externalId: identity.subject,
    ...(identity.email ? { email: identity.email } : {}),
    ...(identity.pictureUrl ? { imageUrl: identity.pictureUrl } : {}),
  });

  const created = await ctx.db.get("users", userId);
  if (created === null) {
    throw new Error("Failed to create user");
  }
  return created;
}

export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const userRecord = await getCurrentUser(ctx);
  if (!userRecord) {
    throw new Error("Can't get current user");
  }
  return userRecord;
}

export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }
  return await userByExternalId(ctx, identity.subject);
}

async function userByExternalId(
  ctx: QueryCtx | MutationCtx,
  externalId: string,
) {
  return await ctx.db
    .query("users")
    .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
    .unique();
}
