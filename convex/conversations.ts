import { v } from "convex/values";
import { conversationValidator, messageValidator } from "./schema";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, getOrCreateCurrentUser } from "./users";

const conversationDocValidator = conversationValidator.extend({
  _id: v.id("conversations"),
  _creationTime: v.number(),
});

const messageDocValidator = messageValidator.extend({
  _id: v.id("messages"),
  _creationTime: v.number(),
});

export const list = query({
  args: {},
  returns: v.array(conversationDocValidator),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      return [];
    }

    return await ctx.db
      .query("conversations")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
  },
});

export const get = query({
  args: { conversationId: v.id("conversations") },
  returns: v.union(
    v.null(),
    v.object({
      conversation: conversationDocValidator,
      messages: v.array(messageDocValidator),
    }),
  ),
  handler: async (ctx, { conversationId }) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      return null;
    }

    const conversation = await ctx.db.get("conversations", conversationId);
    if (conversation === null || conversation.userId !== user._id) {
      return null;
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", conversationId),
      )
      .take(200);

    return { conversation, messages };
  },
});

export const create = mutation({
  args: { text: v.string() },
  returns: v.id("conversations"),
  handler: async (ctx, { text }) => {
    const content = text.trim();
    if (content.length === 0) {
      throw new Error("Message cannot be empty");
    }

    const user = await getOrCreateCurrentUser(ctx);
    const conversationId = await ctx.db.insert("conversations", {
      userId: user._id,
      title: titleFromText(content),
    });
    await ctx.db.insert("messages", {
      conversationId,
      role: "user",
      content,
    });
    return conversationId;
  },
});

export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    text: v.string(),
  },
  returns: v.id("messages"),
  handler: async (ctx, { conversationId, text }) => {
    const content = text.trim();
    if (content.length === 0) {
      throw new Error("Message cannot be empty");
    }

    const user = await getOrCreateCurrentUser(ctx);
    const conversation = await ctx.db.get("conversations", conversationId);
    if (conversation === null || conversation.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    return await ctx.db.insert("messages", {
      conversationId,
      role: "user",
      content,
    });
  },
});

export const appendAssistant = mutation({
  args: {
    conversationId: v.id("conversations"),
    text: v.string(),
  },
  returns: v.id("messages"),
  handler: async (ctx, { conversationId, text }) => {
    const content = text.trim();
    if (content.length === 0) {
      throw new Error("Message cannot be empty");
    }

    const user = await getOrCreateCurrentUser(ctx);
    const conversation = await ctx.db.get("conversations", conversationId);
    if (conversation === null || conversation.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    return await ctx.db.insert("messages", {
      conversationId,
      role: "assistant",
      content,
    });
  },
});

function titleFromText(text: string) {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length === 0) {
    return "New chat";
  }
  if (trimmed.length <= 60) {
    return trimmed;
  }
  return `${trimmed.slice(0, 57).trimEnd()}...`;
}
