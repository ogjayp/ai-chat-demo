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
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ChatPane({ conversationId }: { conversationId?: string }) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { openSignUp } = useClerk();
  const createConversation = useMutation(api.conversations.create);
  const sendMessage = useMutation(api.conversations.send);

  const typedId = conversationId as Id<"conversations"> | undefined;
  const conversation = useQuery(
    api.conversations.get,
    typedId ? { conversationId: typedId } : "skip",
  );

  useEffect(() => {
    if (!typedId || conversation === undefined) {
      return;
    }
    if (conversation === null) {
      router.replace("/");
    }
  }, [conversation, router, typedId]);

  const messages = conversation?.messages ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0">
        <ConversationContent>
          {typedId && conversation === undefined ? null : messages.length === 0 ? (
            <ConversationEmptyState
              description="Type a message below to get started."
              title="What's on your mind?"
            />
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message._id}>
                <MessageContent>{message.content}</MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        <PromptInputProvider>
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
                router.push(`/c/${id}`);
                return;
              }

              await sendMessage({ conversationId: typedId, text: content });
            }}
          >
            <PromptInputBody>
              <PromptInputTextarea placeholder="Message AI Chat…" />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools />
              <PromptInputSubmit />
            </PromptInputFooter>
          </PromptInput>
        </PromptInputProvider>
      </div>
    </div>
  );
}
