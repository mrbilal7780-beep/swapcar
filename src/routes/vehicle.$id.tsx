import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/Header";
import { findCar, CARS, matchScore } from "@/data/cars";

export const Route = createFileRoute("/vehicle/$id")({
  head: ({ params }) => {
    const c = findCar(params.id);
    const title = c ? `${c.brand} ${c.model} — SwapCars AI` : "Véhicule — SwapCars AI";
    const desc = c ? `${c.year} • ${c.mileage.toLocaleString("fr-FR")} km • ${c.price.toLocaleString("fr-FR")} €` : "Détail véhicule";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(c ? [{ property: "og:image", content: c.image }] : []),
      ],
    };
  },
  loader: ({ params }) => {
    const car = findCar(params.id);
    if (!car) throw notFound();
    return { car };
  },
  component: VehicleDetail,
  errorComponent: ({ error }) => <PageShell><div className="p-12 text-center">Erreur : {error.message}</div></PageShell>,
  notFoundComponent: () => <PageShell><div className="p-12 text-center">Véhicule introuvable.</div></PageShell>,
});

function VehicleDetail() {
  const { car } = Route.useLoaderData();
  const matches = CARS.filter((c) => c.id !== car.id)
    .map((c) => ({ car: c, score: matchScore(car, c) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return (
    <PageShell>
      <section className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        <Link to="/explore" className="text-sm text-muted-foreground hover:text-foreground">← Retour aux véhicules</Link>

        <div className="grid lg:grid-cols-2 gap-10 mt-6">
          <div className="glass rounded-3xl overflow-hidden">
            <img src={car.image} alt={`${car.brand} ${car.model}`} width={1024} height={640} className="w-full aspect-[16/10] object-cover" />
          </div>

          <div>
            <div className="text-xs uppercase tracking-widest text-primary">{car.city} • {car.distance} km</div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mt-3">{car.brand} {car.model}</h1>
            <p className="text-muted-foreground mt-2">{car.generation} • {car.year} • {car.mileage.toLocaleString("fr-FR")} km</p>
            <div className="text-4xl font-black mt-6">{car.price.toLocaleString("fr-FR")} €</div>

            <div className="grid grid-cols-2 gap-3 mt-8">
              <Info label="Carburant" v={car.fuel} />
              <Info label="Boîte" v={car.transmission} />
              <Info label="Couleur" v={car.color} />
              <Info label="Propriétaire" v={`${car.owner} · ${car.ownerScore}%`} />
            </div>

            <div className="flex gap-3 mt-8">
              <Link to="/chat" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-full text-center font-semibold glow">
                Proposer un échange
              </Link>
              <button className="glass px-6 py-4 rounded-full hover:bg-white/10">♡</button>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Analyse IA</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Score label="Carrosserie" v={car.scores.body} />
            <Score label="Intérieur" v={car.scores.interior} />
            <Score label="Mécanique" v={car.scores.mechanical} />
            <Score label="Confiance" v={car.scores.confidence} />
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Matches IA suggérés</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {matches.map(({ car: m, score }) => (
              <Link key={m.id} to="/vehicle/$id" params={{ id: m.id }} className="glass rounded-3xl overflow-hidden hover:scale-[1.02] transition-transform">
                <div className="aspect-[16/10] relative">
                  <img src={m.image} alt={`${m.brand} ${m.model}`} width={1024} height={640} loading="lazy" className="w-full h-full object-cover" />
                  <div className="absolute top-3 right-3 glass px-3 py-1 rounded-full text-sm font-bold text-primary">{score}%</div>
                </div>
                <div className="p-5">
                  <div className="font-bold">{m.brand} {m.model}</div>
                  <div className="text-xs text-muted-foreground mt-1">{m.year} • {m.price.toLocaleString("fr-FR")} €</div>
                  <div className="text-xs mt-2 text-muted-foreground">
                    Compensation : <span className="text-foreground font-semibold">{(car.price - m.price >= 0 ? "+ " : "− ") + Math.abs(car.price - m.price).toLocaleString("fr-FR")} €</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function Info({ label, v }: { label: string; v: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{v}</div>
    </div>
  );
}

function Score({ label, v }: { label: string; v: number }) {
  return (
    <div className="glass rounded-3xl p-6">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-4xl font-black mt-2 text-gradient">{v}</div>
      <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary to-primary/60" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}