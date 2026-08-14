import { AppShell } from "@/components/chat/app-shell";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
