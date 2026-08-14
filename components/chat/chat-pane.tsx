"use client";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Suggestion } from "@/components/ai-elements/suggestion";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PENDING_AI_STORAGE_KEY } from "@/lib/chat";
import { useChat } from "@ai-sdk/react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { DefaultChatTransport } from "ai";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { SparklesIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";

const SUGGESTIONS = [
  "Explain a concept like I'm five",
  "Help me debug a TypeScript error",
  "Draft a short product update email",
  "Brainstorm weekend project ideas",
];

export function ChatPane({ conversationId }: { conversationId?: string }) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoading: isConvexLoading, isAuthenticated: isConvexAuthenticated } =
    useConvexAuth();
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

  // Redirect away from conversations that don't exist or aren't ours. Convex
  // queries can briefly run unauthenticated while the Clerk token is being
  // attached, so only trust `null` once auth has settled.
  useEffect(() => {
    if (!typedId || conversation !== null || isConvexLoading) {
      return;
    }
    if (isConvexAuthenticated || (isLoaded && !isSignedIn)) {
      router.replace("/");
    }
  }, [
    conversation,
    isConvexAuthenticated,
    isConvexLoading,
    isLoaded,
    isSignedIn,
    router,
    typedId,
  ]);

  // After creating a conversation on "/", kick off the AI response for the
  // first message once we land on the conversation page.
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
  const isBusy = status === "submitted" || status === "streaming";

  const startOrSend = useCallback(
    async (content: string) => {
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
    },
    [createConversation, persistUserMessage, router, sendMessage, typedId],
  );

  const handleSuggestion = useCallback(
    (suggestion: string) => {
      if (!isLoaded || isBusy) {
        return;
      }
      if (!isSignedIn) {
        openSignUp();
        return;
      }
      void startOrSend(suggestion);
    },
    [isBusy, isLoaded, isSignedIn, openSignUp, startOrSend],
  );

  // Show the in-flight assistant reply from useChat until the persisted copy
  // lands in Convex. Comparing against the last persisted assistant message
  // covers both the gap after streaming ends (before the mutation commits)
  // and the stale previous reply useChat still holds while a new send is
  // in flight.
  const lastPersistedAssistant = [...persisted]
    .reverse()
    .find((message) => message.role === "assistant");
  const chatAssistant = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const chatAssistantText = chatAssistant
    ? chatAssistant.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("")
    : "";
  const overlayText =
    chatAssistantText.trim().length > 0 &&
    chatAssistantText.trim() !== lastPersistedAssistant?.content
      ? chatAssistantText
      : "";

  const isLoadingConversation = Boolean(typedId) && conversation === undefined;
  const showThinking = status === "submitted" && overlayText.length === 0;
  const showEmptyState =
    !isLoadingConversation &&
    persisted.length === 0 &&
    overlayText.length === 0 &&
    !showThinking;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0">
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {isLoadingConversation ? null : showEmptyState ? (
            <ConversationEmptyState className="min-h-[55svh]">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <SparklesIcon className="size-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-semibold tracking-tight">
                  What&apos;s on your mind?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Ask anything — ideas, code, plans, or a quick question.
                </p>
              </div>
              <div className="mt-2 flex max-w-md flex-wrap items-center justify-center gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <Suggestion
                    key={suggestion}
                    onClick={handleSuggestion}
                    suggestion={suggestion}
                  />
                ))}
              </div>
            </ConversationEmptyState>
          ) : (
            <>
              {persisted.map((message) => (
                <Message
                  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                  from={message.role}
                  key={message._id}
                >
                  <MessageContent className="group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground">
                    {message.role === "assistant" ? (
                      <MessageResponse>{message.content}</MessageResponse>
                    ) : (
                      message.content
                    )}
                  </MessageContent>
                </Message>
              ))}
              {overlayText ? (
                <Message from="assistant" key="streaming-assistant">
                  <MessageContent>
                    <MessageResponse>{overlayText}</MessageResponse>
                  </MessageContent>
                </Message>
              ) : null}
              {showThinking ? (
                <Message
                  className="animate-in fade-in duration-300"
                  from="assistant"
                  key="thinking"
                >
                  <MessageContent>
                    <Shimmer>Thinking…</Shimmer>
                  </MessageContent>
                </Message>
              ) : null}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        {error ? (
          <p className="mb-2 text-sm text-destructive">{error.message}</p>
        ) : null}
        <PromptInput
          className="rounded-2xl shadow-lg shadow-black/5"
          onSubmit={async ({ text }) => {
            const content = text.trim();
            if (content.length === 0) {
              return;
            }
            if (isBusy) {
              // Enter can still trigger a submit while a response is
              // streaming; keep the draft and ignore it.
              throw new Error("Wait for the current response to finish");
            }
            if (!isLoaded) {
              throw new Error("Auth is still loading");
            }
            if (!isSignedIn) {
              openSignUp();
              throw new Error("Authentication required");
            }

            await startOrSend(content);
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
        <p className="mt-2 text-center text-xs text-muted-foreground">
          AI can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}
