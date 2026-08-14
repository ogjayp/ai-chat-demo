import type { UIMessage } from "ai";
import { convertToModelMessages, streamText } from "ai";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CHAT_MODEL } from "@/lib/chat";
import { requireConvexUser } from "@/lib/require-convex-user";

export async function POST(request: Request) {
  const authResult = await requireConvexUser();
  if (!authResult.ok) {
    return authResult.response;
  }

  const json: unknown = await request.json().catch(() => null);
  const parsed = parseChatRequest(json);
  if (parsed === null) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { conversationId, messages } = parsed;
  const { token } = authResult;

  const existing = await fetchQuery(
    api.conversations.get,
    { conversationId },
    { token },
  );
  if (existing === null) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  const lastUserText = lastUserMessageText(messages);
  const lastStored = existing.messages.at(-1);
  if (
    lastUserText &&
    !(lastStored?.role === "user" && lastStored.content === lastUserText)
  ) {
    await fetchMutation(
      api.conversations.send,
      { conversationId, text: lastUserText },
      { token },
    );
  }

  const history = await fetchQuery(
    api.conversations.get,
    { conversationId },
    { token },
  );
  if (history === null) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  const modelMessages = await convertToModelMessages(
    toUIMessages(history.messages),
  );

  const result = streamText({
    model: CHAT_MODEL,
    system: "You are a helpful chat assistant.",
    messages: modelMessages,
    onEnd: async ({ text }) => {
      const content = text.trim();
      if (content.length === 0) {
        return;
      }
      await fetchMutation(
        api.conversations.appendAssistant,
        { conversationId, text: content },
        { token },
      );
    },
  });

  return result.toUIMessageStreamResponse();
}

function parseChatRequest(body: unknown): {
  conversationId: Id<"conversations">;
  messages: UIMessage[];
} | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const record = body as Record<string, unknown>;
  if (typeof record.conversationId !== "string" || record.conversationId.length === 0) {
    return null;
  }
  if (!Array.isArray(record.messages)) {
    return null;
  }

  return {
    conversationId: record.conversationId as Id<"conversations">,
    messages: record.messages as UIMessage[],
  };
}

function lastUserMessageText(messages: UIMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") {
      continue;
    }
    const text = uiMessageText(message).trim();
    if (text.length > 0) {
      return text;
    }
  }
  return null;
}

function toUIMessages(
  messages: Array<{ _id: string; role: "user" | "assistant"; content: string }>,
): UIMessage[] {
  return messages.map((message) => ({
    id: message._id,
    role: message.role,
    parts: [{ type: "text" as const, text: message.content }],
  }));
}

function uiMessageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}
