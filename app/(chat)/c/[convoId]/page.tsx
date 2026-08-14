import { ChatPane } from "@/components/chat/chat-pane";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ convoId: string }>;
}) {
  const { convoId } = await params;
  return <ChatPane conversationId={convoId} />;
}
