"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { SquarePenIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ChatSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const conversations = useQuery(api.conversations.list);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between px-3 py-3">
        <Link
          className="truncate text-sm font-semibold tracking-tight"
          href="/"
          onClick={onNavigate}
        >
          AI Chat
        </Link>
      </div>
      <div className="px-2 pb-2">
        <Button asChild className="w-full justify-start gap-2" variant="outline">
          <Link href="/" onClick={onNavigate}>
            <SquarePenIcon />
            New chat
          </Link>
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1 px-2 pb-3">
        <div className="flex flex-col gap-0.5">
          {conversations === undefined ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              Loading chats…
            </p>
          ) : conversations.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              Your chat history will show up here.
            </p>
          ) : (
            conversations.map((conversation) => {
              const href = `/c/${conversation._id}`;
              const active = pathname === href;
              return (
                <Link
                  className={cn(
                    "truncate rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    active &&
                      "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                  )}
                  href={href}
                  key={conversation._id}
                  onClick={onNavigate}
                >
                  {conversation.title}
                </Link>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
