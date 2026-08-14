"use client";

import { AuthButtons } from "@/components/chat/auth-buttons";
import { ChatSidebar } from "@/components/chat/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PanelLeftIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-background">
      {sidebarOpen ? (
        <button
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          type="button"
        />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-sidebar-border transition-transform md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <ChatSidebar onNavigate={() => setSidebarOpen(false)} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-3">
          <Button
            aria-label="Open sidebar"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <PanelLeftIcon />
          </Button>
          <div className="ml-auto">
            <AuthButtons />
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
