import { BottomNav } from "@/components/BottomNav";
import { NotificationsBell } from "@/components/social/NotificationsBell";
import { LocationSync } from "@/components/events/NearbyCard";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="pt-[max(0.5rem,env(safe-area-inset-top))] pb-24">
        {/* Bandeau commun : logo à gauche, notifications à droite */}
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 h-12">
          <img src="/torque-logo-login.png" alt="TORQUE" className="h-9 w-auto" />
          <NotificationsBell />
        </div>
        {children}
      </main>
      <LocationSync />
      <BottomNav />
    </div>
  );
}
