import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, ArrowLeft, TrendingUp } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/garage")({
  head: () => ({ meta: [{ title: "Garage — TORQUE" }] }),
  component: () => (
    <RequireAuthWrapper>
      <GaragePage />
    </RequireAuthWrapper>
  ),
});

function RequireAuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function GaragePage() {
  const { user } = useAuth();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const { data: vehicles = [] } = useQuery({
    queryKey: ["garage", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (selectedVehicleId) {
    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (vehicle) {
      return (
        <VehiclePassport
          vehicle={vehicle}
          onBack={() => setSelectedVehicleId(null)}
        />
      );
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <style>{`html { padding-top: max(0px, env(safe-area-inset-top)); padding-bottom: max(0px, env(safe-area-inset-bottom)); padding-left: max(0px, env(safe-area-inset-left)); padding-right: max(0px, env(safe-area-inset-right)); }`}</style>

      <div className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-black">My Garage</h1>
          <Link
            to="/add-vehicle"
            className="p-2 hover:bg-white/5 rounded-lg transition bg-primary/20"
          >
            <Plus className="w-5 h-5 text-primary" />
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-3 mb-8">
          <StatCard label="Total" value={vehicles.length.toString()} />
          <StatCard label="Build Score" value="85" />
          <StatCard label="Total Value" value={`€${(vehicles.length * 28000).toLocaleString()}`} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {vehicles.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">Car</div>
            <p className="text-muted-foreground mb-6">No vehicles yet</p>
            <Link
              to="/add-vehicle"
              className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-full font-semibold hover:bg-primary/90 transition"
            >
              Add Your First Car
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {vehicles.map((vehicle: any) => (
              <button
                key={vehicle.id}
                onClick={() => setSelectedVehicleId(vehicle.id)}
                className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 transition text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex-shrink-0 flex items-center justify-center text-2xl">
                    T
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold">{vehicle.brand} {vehicle.model}</h3>
                    <p className="text-sm text-muted-foreground">{vehicle.year} · {vehicle.mileage?.toLocaleString()} km</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full w-4/5 bg-gradient-to-r from-primary to-primary/60" />
                      </div>
                      <span className="text-xs font-bold text-primary">85/100</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <MobileNav activeTab="garage" />
    </div>
  );
}

interface VehiclePassportProps {
  vehicle: any;
  onBack: () => void;
}

function VehiclePassport({ vehicle, onBack }: VehiclePassportProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 pb-24">
      <style>{`html { padding-top: max(0px, env(safe-area-inset-top)); padding-bottom: max(0px, env(safe-area-inset-bottom)); padding-left: max(0px, env(safe-area-inset-left)); padding-right: max(0px, env(safe-area-inset-right)); }`}</style>

      <div className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/5 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-black flex-1">Vehicle Passport</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="w-full h-48 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-6xl mb-6">
          T
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mb-8">
        <h1 className="text-4xl font-black mb-2">{vehicle.brand} {vehicle.model}</h1>
        <p className="text-lg text-muted-foreground">{vehicle.year} · {vehicle.fuel}</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 mb-8">
        <div className="bg-gradient-to-r from-primary/20 to-primary/10 rounded-3xl p-8 border border-primary/30 text-center">
          <p className="text-sm text-muted-foreground uppercase tracking-widest mb-2">Build Score</p>
          <div className="text-7xl font-black text-gradient mb-2">85</div>
          <div className="text-sm text-muted-foreground">Legend Status</div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mb-8">
        <h2 className="text-lg font-bold mb-4">Vehicle Level</h2>
        <div className="flex gap-2">
          <LevelBadge level="Bronze" active={false} />
          <LevelBadge level="Silver" active={false} />
          <LevelBadge level="Gold" active={true} />
          <LevelBadge level="Legend" active={false} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mb-8">
        <h2 className="text-lg font-bold mb-4">Specifications</h2>
        <div className="grid grid-cols-2 gap-3">
          <SpecCard label="Mileage" value={`${vehicle.mileage?.toLocaleString()} km`} />
          <SpecCard label="Transmission" value="Automatic" />
          <SpecCard label="Fuel Type" value={vehicle.fuel} />
          <SpecCard label="Engine" value="3.0L" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mb-8">
        <h2 className="text-lg font-bold mb-4">AI Valuation</h2>
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Estimated Value</p>
              <p className="text-4xl font-black">€{(vehicle.price || 28500).toLocaleString()}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Market Price</span>
              <span>€29,500</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Your Price</span>
              <span className="text-primary font-bold">€28,500</span>
            </div>
            <div className="flex justify-between font-bold text-primary border-t border-white/10 pt-2">
              <span>Difference</span>
              <span>-€1,000 (-3%)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mb-8">
        <h2 className="text-lg font-bold mb-4">Modifications</h2>
        <div className="space-y-2">
          <ModItem title="Performance Tuning" status="verified" />
          <ModItem title="Custom Paint" status="verified" />
          <ModItem title="Interior Upgrade" status="pending" />
          <ModItem title="Suspension Kit" status="pending" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mb-8">
        <h2 className="text-lg font-bold mb-4">Maintenance History</h2>
        <div className="space-y-2">
          <HistoryItem date="2026-05-15" title="Oil Change" type="maintenance" />
          <HistoryItem date="2026-04-20" title="Tire Rotation" type="maintenance" />
          <HistoryItem date="2026-03-10" title="Engine Inspection" type="inspection" />
          <HistoryItem date="2026-02-05" title="Brake Service" type="maintenance" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mb-8 space-y-3">
        <button className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition">
          Add to Matching Pool
        </button>
        <button className="w-full px-6 py-3 border border-white/20 rounded-xl font-semibold hover:bg-white/5 transition">
          Share Passport
        </button>
      </div>

      <MobileNav activeTab="garage" />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function SpecCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-bold text-sm">{value}</p>
    </div>
  );
}

function LevelBadge({ level, active }: { level: string; active: boolean }) {
  const colors: Record<string, string> = {
    Bronze: "from-amber-600 to-amber-500",
    Silver: "from-slate-400 to-slate-300",
    Gold: "from-yellow-400 to-yellow-300",
    Legend: "from-purple-600 to-pink-500",
  };

  return (
    <div
      className={`flex-1 py-3 rounded-lg font-bold text-sm text-center transition ${
        active
          ? `bg-gradient-to-r ${colors[level] || ""} text-black shadow-lg`
          : "bg-white/5 border border-white/10 text-muted-foreground"
      }`}
    >
      {level}
    </div>
  );
}

function ModItem({ title, status }: { title: string; status: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
      <div className={`w-3 h-3 rounded-full ${status === "verified" ? "bg-green-500" : "bg-yellow-500"}`} />
      <span className="flex-1">{title}</span>
      <span className={`text-xs font-bold ${status === "verified" ? "text-green-400" : "text-yellow-400"}`}>
        {status === "verified" ? "Verified" : "Pending"}
      </span>
    </div>
  );
}

function HistoryItem({ date, title, type }: { date: string; title: string; type: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
      <div className="w-2 h-2 rounded-full bg-primary" />
      <div className="flex-1">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{date}</p>
      </div>
    </div>
  );
}

function MobileNav({ activeTab }: { activeTab: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-white/5 bg-background/80 backdrop-blur-md" style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}>
      <div className="flex items-center justify-around max-w-2xl mx-auto">
        <NavItem label="Home" active={activeTab === "home"} to="/feed" />
        <NavItem label="Explore" active={activeTab === "explore"} to="/explore" />
        <NavItem label="Post" active={activeTab === "post"} to="/post" />
        <NavItem label="Messages" active={activeTab === "messages"} to="/messages" />
        <NavItem label="Garage" active={activeTab === "garage"} to="/garage" />
      </div>
    </nav>
  );
}

function NavItem({ label, active, to }: { label: string; active: boolean; to: string }) {
  return (
    <Link
      to={to}
      className={`flex-1 py-3 px-2 flex flex-col items-center gap-1 text-xs font-semibold transition ${
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <div className="w-5 h-5 rounded-full" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

function Navigate({ to }: { to: string }) {
  return <div>Redirecting...</div>;
}
