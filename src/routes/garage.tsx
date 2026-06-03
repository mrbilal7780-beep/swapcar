import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { PageShell } from "@/components/layout/Header";
import { toast } from "sonner";

export const Route = createFileRoute("/garage")({
  head: () => ({ meta: [{ title: "Mon garage — SwapCars AI" }] }),
  component: () => (
    <RequireAuth>
      <Garage />
    </RequireAuth>
  ),
});

type V = {
  id: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  price: number;
  city: string | null;
  photos: string[];
  status: string;
  ai_estimate: number | null;
  ai_body_score: number | null;
  fuel: string;
  transmission: string;
  created_at: string;
};

function Garage() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<V[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, brand, model, year, mileage, price, city, photos, status, ai_estimate, ai_body_score, fuel, transmission, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      setVehicles((data ?? []) as V[]);
      setLoading(false);
    })();
  }, [user]);

  async function toggleStatus(v: V) {
    const next = v.status === "published" ? "draft" : "published";
    const { error } = await (supabase.from("vehicles") as any)
      .update({ status: next })
      .eq("id", v.id);
    if (error) return toast.error(error.message);
    setVehicles((vs) => vs.map((x) => (x.id === v.id ? { ...x, status: next } : x)));
    toast.success(next === "published" ? "Publié" : "Mis en brouillon");
  }

  async function remove(v: V) {
    if (!confirm(`Supprimer ${v.brand} ${v.model} ?`)) return;
    const { error } = await supabase.from("vehicles").delete().eq("id", v.id);
    if (error) return toast.error(error.message);
    setVehicles((vs) => vs.filter((x) => x.id !== v.id));
    toast.success("Véhicule supprimé");
  }

  const totalValue = vehicles.reduce((s, v) => s + Number(v.price || 0), 0);
  const published = vehicles.filter((v) => v.status === "published").length;

  return (
    <PageShell>
      <section className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight">
              Mon <span className="text-gradient">garage</span>
            </h1>
            <p className="text-muted-foreground mt-2">Gère ta collection automobile.</p>
          </div>
          <Link
            to="/add-vehicle"
            className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold glow"
          >
            + Ajouter un véhicule
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-8">
          <Stat label="Véhicules" value={vehicles.length} />
          <Stat label="Publiés" value={published} />
          <Stat label="Valeur totale" value={`${totalValue.toLocaleString("fr-FR")} €`} />
        </div>

        {loading ? (
          <div className="mt-12 text-center text-muted-foreground">Chargement…</div>
        ) : vehicles.length === 0 ? (
          <div className="mt-16 glass rounded-3xl p-12 text-center">
            <div className="text-6xl mb-4">🚗</div>
            <h2 className="text-xl font-bold">Ton garage est vide</h2>
            <p className="text-muted-foreground mt-2">Ajoute ton premier véhicule pour commencer.</p>
            <Link
              to="/add-vehicle"
              className="inline-block mt-6 bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold glow"
            >
              Déposer mon véhicule
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {vehicles.map((v) => (
              <article key={v.id} className="glass rounded-3xl overflow-hidden group">
                <Link to="/vehicle/$id" params={{ id: v.id }} className="block aspect-[4/3] bg-white/5 overflow-hidden relative">
                  {v.photos?.[0] ? (
                    <img
                      src={v.photos[0]}
                      alt={`${v.brand} ${v.model}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">🚗</div>
                  )}
                  <span
                    className={`absolute top-3 left-3 text-[10px] uppercase tracking-widest px-3 py-1 rounded-full ${
                      v.status === "published" ? "bg-primary text-primary-foreground" : "bg-black/60 text-white"
                    }`}
                  >
                    {v.status === "published" ? "Publié" : "Brouillon"}
                  </span>
                </Link>
                <div className="p-5">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{v.city ?? "—"}</div>
                  <h3 className="font-bold mt-1">
                    {v.brand} {v.model} <span className="text-muted-foreground font-normal">{v.year}</span>
                  </h3>
                  <div className="text-xs text-muted-foreground mt-1">
                    {v.mileage.toLocaleString("fr-FR")} km • {v.fuel} • {v.transmission}
                  </div>
                  <div className="flex items-baseline justify-between mt-3">
                    <div className="text-gradient text-xl font-black">
                      {Number(v.price).toLocaleString("fr-FR")} €
                    </div>
                    {v.ai_estimate && (
                      <div className="text-xs text-muted-foreground">
                        IA: {Math.round(Number(v.ai_estimate)).toLocaleString("fr-FR")} €
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => toggleStatus(v)}
                      className="flex-1 text-xs glass rounded-full py-2 hover:bg-white/10"
                    >
                      {v.status === "published" ? "Dépublier" : "Publier"}
                    </button>
                    <button
                      onClick={() => remove(v)}
                      className="flex-1 text-xs rounded-full py-2 bg-destructive/20 text-destructive hover:bg-destructive/30"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-xl md:text-2xl font-black mt-1">{value}</div>
    </div>
  );
}