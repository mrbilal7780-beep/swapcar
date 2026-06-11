import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/Header";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explorer les véhicules — Carswap AI" },
      { name: "description", content: "Parcourez les véhicules disponibles à l'échange et filtrez par marque, budget et carburant." },
      { property: "og:title", content: "Explorer — Carswap AI" },
      { property: "og:description", content: "Trouvez le véhicule parfait à échanger." },
    ],
  }),
  component: Explore,
});

function Explore() {
  const [brand, setBrand] = useState<string>("all");
  const [fuel, setFuel] = useState<string>("all");
  const [max, setMax] = useState<number>(100000);

  const { data: cars = [], isLoading } = useQuery({
    queryKey: ["vehicles", "published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(
    () =>
      cars.filter(
        (c) =>
          (brand === "all" || c.brand === brand) &&
          (fuel === "all" || c.fuel === fuel) &&
          Number(c.price) <= max,
      ),
    [brand, fuel, max, cars],
  );

  const brands = Array.from(new Set(cars.map((c) => c.brand)));

  return (
    <PageShell>
      <section className="max-w-7xl mx-auto px-6 md:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">
              Explorer <span className="text-gradient">les véhicules</span>
            </h1>
            <p className="text-muted-foreground mt-2">{filtered.length} véhicules disponibles à l'échange</p>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 grid md:grid-cols-3 gap-4 mb-10">
          <Select label="Marque" value={brand} onChange={setBrand} options={[{ v: "all", l: "Toutes" }, ...brands.map((b) => ({ v: b, l: b }))]} />
          <Select label="Carburant" value={fuel} onChange={setFuel} options={[{ v: "all", l: "Tous" }, { v: "Essence", l: "Essence" }, { v: "Diesel", l: "Diesel" }, { v: "Hybride", l: "Hybride" }, { v: "Électrique", l: "Électrique" }]} />
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Budget max : {max.toLocaleString("fr-FR")} €</label>
            <input type="range" min={10000} max={100000} step={1000} value={max} onChange={(e) => setMax(Number(e.target.value))} className="w-full mt-3 accent-[var(--primary)]" />
          </div>
        </div>

        {isLoading && <div className="text-center text-muted-foreground py-12">Chargement…</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="glass rounded-3xl p-12 text-center">
            <div className="text-4xl mb-3">🚗</div>
            <h2 className="text-xl font-bold">Aucun véhicule pour le moment</h2>
            <p className="text-muted-foreground mt-2">Soyez le premier à déposer le vôtre.</p>
            <Link to="/add-vehicle" className="inline-block mt-6 bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold glow">
              Déposer ma voiture
            </Link>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c) => (
            <Link key={c.id} to="/vehicle/$id" params={{ id: c.id }} className="glass rounded-3xl overflow-hidden hover:scale-[1.02] transition-transform">
              <div className="aspect-[16/10] overflow-hidden">
                {c.photos?.[0] ? (
                  <img src={c.photos[0]} alt={`${c.brand} ${c.model}`} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center text-4xl">🚗</div>
                )}
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold">{c.brand} {c.model}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{c.year} • {Number(c.mileage).toLocaleString("fr-FR")} km • {c.fuel}</p>
                  </div>
                  {c.city && <div className="text-xs glass px-2 py-1 rounded-full text-primary">{c.city}</div>}
                </div>
                <div className="mt-5 flex items-end justify-between">
                  <div className="text-2xl font-bold">{Number(c.price).toLocaleString("fr-FR")} €</div>
                  {c.ai_body_score != null && (
                    <div className="text-xs text-muted-foreground">Score IA <span className="text-foreground font-semibold">{c.ai_body_score}</span></div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full bg-secondary border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary">
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.l}</option>
        ))}
      </select>
    </div>
  );
}