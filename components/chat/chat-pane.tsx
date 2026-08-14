"use client";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PENDING_AI_STORAGE_KEY } from "@/lib/chat";
import { useChat } from "@ai-sdk/react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { DefaultChatTransport } from "ai";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

export function ChatPane({ conversationId }: { conversationId?: string }) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { openSignUp } = useClerk();
  const createConversation = useMutation(api.conversations.create);
  const persistUserMessage = useMutation(api.conversations.send);
  const kickedOff = useRef(false);

  const typedId = conversationId as Id<"conversations"> | undefined;
  const conversation = useQuery(
    api.conversations.get,
    typedId ? { conversationId: typedId } : "skip",
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: typedId ? { conversationId: typedId } : {},
      }),
    [typedId],
  );

  const { messages, sendMessage, status, error, stop } = useChat({
    id: typedId ?? "new",
    transport,
  });

  useEffect(() => {
    if (!typedId || conversation === undefined) {
      return;
    }
    if (conversation === null) {
      router.replace("/");
    }
  }, [conversation, router, typedId]);

  useEffect(() => {
    if (!typedId || conversation === undefined || conversation === null) {
      return;
    }
    if (kickedOff.current) {
      return;
    }
    const pending = sessionStorage.getItem(PENDING_AI_STORAGE_KEY);
    if (pending !== typedId) {
      return;
    }
    sessionStorage.removeItem(PENDING_AI_STORAGE_KEY);
    const last = conversation.messages.at(-1);
    if (last?.role !== "user") {
      return;
    }
    kickedOff.current = true;
    void sendMessage({ text: last.content });
  }, [conversation, sendMessage, typedId]);

  const persisted = conversation?.messages ?? [];
  const isStreaming = status === "submitted" || status === "streaming";
  const streamingAssistant = isStreaming
    ? [...messages].reverse().find((message) => message.role === "assistant")
    : undefined;
  const streamingText = streamingAssistant
    ? streamingAssistant.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("")
    : "";

  const visibleMessages = [
    ...persisted,
    ...(streamingText
      ? [
          {
            _id: "streaming-assistant",
            role: "assistant" as const,
            content: streamingText,
          },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0">
        <ConversationContent>
          {typedId && conversation === undefined ? null : visibleMessages.length ===
            0 ? (
            <ConversationEmptyState
              description="Type a message below to get started."
              title="What's on your mind?"
            />
          ) : (
            visibleMessages.map((message) => (
              <Message from={message.role} key={message._id}>
                <MessageContent>{message.content}</MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        {error ? (
          <p className="mb-2 text-sm text-destructive">{error.message}</p>
        ) : null}
        <PromptInput
          className="rounded-2xl"
          onSubmit={async ({ text }) => {
            const content = text.trim();
            if (content.length === 0) {
              return;
            }
            if (!isLoaded) {
              throw new Error("Auth is still loading");
            }
            if (!isSignedIn) {
              openSignUp();
              throw new Error("Authentication required");
            }

            if (!typedId) {
              const id = await createConversation({ text: content });
              sessionStorage.setItem(PENDING_AI_STORAGE_KEY, id);
              router.push(`/c/${id}`);
              return;
            }

            await persistUserMessage({
              conversationId: typedId,
              text: content,
            });
            await sendMessage({ text: content });
          }}
        >
          <PromptInputBody>
            <PromptInputTextarea placeholder="Message AI Chat…" />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools />
            <PromptInputSubmit onStop={stop} status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
