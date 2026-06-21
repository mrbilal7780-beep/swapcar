import { BottomNav } from "@/components/BottomNav";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="pt-[max(1rem,env(safe-area-inset-top))] pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}