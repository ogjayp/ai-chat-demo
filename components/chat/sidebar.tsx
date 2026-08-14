"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { SparklesIcon, SquarePenIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ChatSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const conversations = useQuery(api.conversations.list);

  return (
    <div className="flex h-full flex-col text-sidebar-foreground">
      <div className="flex items-center gap-2 px-4 pb-2 pt-4">
        <Link
          className="flex items-center gap-2.5"
          href="/"
          onClick={onNavigate}
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <SparklesIcon className="size-4" />
          </span>
          <span className="truncate text-sm font-semibold tracking-tight">
            AI Chat
          </span>
        </Link>
      </div>
      <div className="px-3 pb-2 pt-2">
        <Button
          asChild
          className="w-full justify-start gap-2 rounded-lg bg-background shadow-xs"
          variant="outline"
        >
          <Link href="/" onClick={onNavigate}>
            <SquarePenIcon className="size-4" />
            New chat
          </Link>
        </Button>
      </div>
      {/* Radix ScrollArea wraps content in a `display: table` div that grows
          with content; force it to block so long titles truncate instead of
          widening the list. */}
      <ScrollArea className="min-h-0 flex-1 overflow-hidden px-3 pb-3 [&>[data-slot=scroll-area-viewport]>div]:block!">
        {conversations === undefined ? (
          <div className="flex flex-col gap-1.5 pt-2">
            {[0, 1, 2, 3].map((row) => (
              <div
                className="h-8 animate-pulse rounded-lg bg-sidebar-accent/70"
                key={row}
              />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-1 py-3 text-xs text-muted-foreground">
            Your chat history will show up here.
          </p>
        ) : (
          <>
            <p className="px-2 pb-1.5 pt-2 text-xs font-medium text-muted-foreground">
              Recent
            </p>
            <div className="flex flex-col gap-0.5">
              {conversations.map((conversation) => {
                const href = `/c/${conversation._id}`;
                const active = pathname === href;
                return (
                  <Link
                    className={cn(
                      "block min-w-0 truncate rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      active &&
                        "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                    )}
                    href={href}
                    key={conversation._id}
                    onClick={onNavigate}
                    title={conversation.title}
                  >
                    {conversation.title}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </ScrollArea>
    </div>
  );
}
