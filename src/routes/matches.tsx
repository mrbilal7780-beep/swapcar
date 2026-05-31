import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/layout/Header";
import { CARS, matchScore, type Car } from "@/data/cars";

export const Route = createFileRoute("/matches")({
  head: () => ({
    meta: [
      { title: "Mes matches — SwapCars AI" },
      { name: "description", content: "Découvrez les véhicules les plus compatibles avec le vôtre, façon Tinder." },
      { property: "og:title", content: "Matches IA — SwapCars AI" },
      { property: "og:description", content: "Swipez. Échangez. Roulez." },
    ],
  }),
  component: Matches,
});

function Matches() {
  // Suppose user owns car #1 (BMW M340i)
  const myCar = CARS[0];
  const candidates = CARS.filter((c) => c.id !== myCar.id);
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState<Car[]>([]);

  const current = candidates[index];
  const score = current ? matchScore(myCar, current) : 0;

  function next(like: boolean) {
    if (like && current) setLiked((l) => [...l, current]);
    setIndex((i) => i + 1);
  }

  return (
    <PageShell>
      <section className="max-w-3xl mx-auto px-6 md:px-8 py-8">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-center">
          Vos <span className="text-gradient">matches IA</span>
        </h1>
        <p className="text-center text-muted-foreground mt-2 mb-10">
          Basés sur votre {myCar.brand} {myCar.model}
        </p>

        {current ? (
          <div className="relative">
            <div className="glass rounded-[2rem] overflow-hidden">
              <div className="aspect-[4/5] sm:aspect-[16/10] relative">
                <img src={current.image} alt={`${current.brand} ${current.model}`} width={1024} height={640} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute top-4 right-4 glass px-4 py-2 rounded-full font-bold text-primary">{score}% match</div>
                <div className="absolute bottom-0 inset-x-0 p-6 text-white">
                  <div className="text-xs uppercase tracking-widest opacity-70">{current.city} • {current.distance} km</div>
                  <div className="text-2xl font-black mt-1">{current.brand} {current.model}</div>
                  <div className="text-sm opacity-80 mt-1">{current.year} • {current.mileage.toLocaleString("fr-FR")} km</div>
                  <div className="text-xl font-bold mt-2">{current.price.toLocaleString("fr-FR")} €</div>
                </div>
              </div>
              <div className="p-6 space-y-2 text-sm">
                <Row label="Valeur similaire" ok={Math.abs(myCar.price - current.price) < 5000} />
                <Row label="Même catégorie" ok={true} />
                <Row label="Distance < 100 km" ok={current.distance < 100} />
                <Row label="Propriétaire vérifié" ok={current.ownerScore > 80} />
              </div>
            </div>

            <div className="flex justify-center gap-6 mt-8">
              <button onClick={() => next(false)} className="w-16 h-16 rounded-full glass hover:bg-destructive/20 text-2xl">✕</button>
              <Link to="/vehicle/$id" params={{ id: current.id }} className="w-16 h-16 rounded-full glass hover:bg-white/10 flex items-center justify-center text-xl">👁</Link>
              <button onClick={() => next(true)} className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 text-2xl glow">♡</button>
            </div>
          </div>
        ) : (
          <div className="glass rounded-3xl p-12 text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold">Vous avez tout vu !</h2>
            <p className="text-muted-foreground mt-2">{liked.length} véhicule(s) ajouté(s) à vos favoris.</p>
            <Link to="/explore" className="inline-block mt-6 bg-primary px-6 py-3 rounded-full font-semibold glow">Continuer à explorer</Link>
          </div>
        )}

        {liked.length > 0 && (
          <div className="mt-16">
            <h3 className="text-xl font-bold mb-4">❤ Vos coups de cœur</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {liked.map((c) => (
                <Link key={c.id} to="/vehicle/$id" params={{ id: c.id }} className="glass rounded-2xl overflow-hidden">
                  <img src={c.image} alt={c.brand} width={1024} height={640} loading="lazy" className="w-full aspect-video object-cover" />
                  <div className="p-3 text-xs">
                    <div className="font-semibold">{c.brand} {c.model}</div>
                    <div className="text-muted-foreground">{c.price.toLocaleString("fr-FR")} €</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </PageShell>
  );
}

function Row({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-3 text-muted-foreground">
      <span className={ok ? "text-primary" : "text-destructive"}>{ok ? "✓" : "✕"}</span>
      <span>{label}</span>
    </div>
  );
}