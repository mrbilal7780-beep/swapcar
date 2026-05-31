import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { PageShell } from "@/components/layout/Header";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Mon profil — SwapCars AI" },
      { name: "description", content: "Gérez votre profil, vos véhicules et votre score de confiance." },
      { property: "og:title", content: "Mon profil — SwapCars AI" },
      { property: "og:description", content: "Votre tableau de bord SwapCars AI." },
    ],
  }),
  component: () => <RequireAuth><Profile /></RequireAuth>,
});

function Profile() {
  const { user } = useAuth();
  const userId = user!.id;

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
      return data;
    },
  });

  const { data: myCars = [] } = useQuery({
    queryKey: ["my-vehicles", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const initials = (profile?.display_name ?? user!.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <PageShell>
      <section className="max-w-5xl mx-auto px-6 md:px-8 py-8">
        <div className="glass rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-center md:items-end gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/40 glow flex items-center justify-center text-3xl font-black">{initials}</div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-black tracking-tight">{profile?.display_name ?? user!.email}</h1>
            <p className="text-muted-foreground mt-1">{profile?.city ?? "Profil SwapCars AI"}</p>
            <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
              <Badge>✓ Email</Badge>
              {profile?.verified && <Badge>✓ Identité</Badge>}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Score de confiance</div>
            <div className="text-5xl font-black text-gradient mt-1">{profile?.trust_score ?? 50}</div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <Stat label="Mes véhicules" v={String(myCars.length)} />
          <Stat label="Score" v={String(profile?.trust_score ?? 50)} />
          <Stat label="Statut" v={profile?.verified ? "Vérifié" : "Standard"} />
        </div>

        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Mes véhicules</h2>
            <Link to="/add-vehicle" className="text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-full font-semibold glow">
              + Ajouter
            </Link>
          </div>
          {myCars.length === 0 ? (
            <div className="glass rounded-3xl p-12 text-center text-muted-foreground">
              Aucun véhicule pour le moment.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {myCars.map((c) => (
                <Link key={c.id} to="/vehicle/$id" params={{ id: c.id }} className="glass rounded-3xl overflow-hidden hover:scale-[1.02] transition-transform">
                  {c.photos?.[0] ? (
                    <img src={c.photos[0]} alt={c.brand} className="w-full aspect-[16/10] object-cover" />
                  ) : (
                    <div className="w-full aspect-[16/10] bg-secondary flex items-center justify-center text-4xl">🚗</div>
                  )}
                  <div className="p-5">
                    <div className="font-bold">{c.brand} {c.model}</div>
                    <div className="text-sm text-muted-foreground mt-1">{c.year} • {Number(c.price).toLocaleString("fr-FR")} €</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="text-xs glass px-3 py-1 rounded-full text-primary">{children}</span>;
}
function Stat({ label, v }: { label: string; v: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-2">{v}</div>
    </div>
  );
}