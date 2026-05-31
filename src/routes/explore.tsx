import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { PageShell } from "@/components/layout/Header";
import { CARS } from "@/data/cars";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explorer les véhicules — SwapCars AI" },
      { name: "description", content: "Parcourez les véhicules disponibles à l'échange et filtrez par marque, budget et carburant." },
      { property: "og:title", content: "Explorer — SwapCars AI" },
      { property: "og:description", content: "Trouvez le véhicule parfait à échanger." },
    ],
  }),
  component: Explore,
});

function Explore() {
  const [brand, setBrand] = useState<string>("all");
  const [fuel, setFuel] = useState<string>("all");
  const [max, setMax] = useState<number>(100000);

  const filtered = useMemo(
    () =>
      CARS.filter(
        (c) =>
          (brand === "all" || c.brand === brand) &&
          (fuel === "all" || c.fuel === fuel) &&
          c.price <= max,
      ),
    [brand, fuel, max],
  );

  const brands = Array.from(new Set(CARS.map((c) => c.brand)));

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

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c) => (
            <Link key={c.id} to="/vehicle/$id" params={{ id: c.id }} className="glass rounded-3xl overflow-hidden hover:scale-[1.02] transition-transform">
              <div className="aspect-[16/10] overflow-hidden">
                <img src={c.image} alt={`${c.brand} ${c.model}`} width={1024} height={640} loading="lazy" className="w-full h-full object-cover" />
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold">{c.brand} {c.model}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{c.year} • {c.mileage.toLocaleString("fr-FR")} km • {c.fuel}</p>
                  </div>
                  <div className="text-xs glass px-2 py-1 rounded-full text-primary">{c.city}</div>
                </div>
                <div className="mt-5 flex items-end justify-between">
                  <div className="text-2xl font-bold">{c.price.toLocaleString("fr-FR")} €</div>
                  <div className="text-xs text-muted-foreground">Score IA <span className="text-foreground font-semibold">{c.scores.body}</span></div>
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