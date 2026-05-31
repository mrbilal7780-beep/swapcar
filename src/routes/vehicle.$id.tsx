import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/Header";

export const Route = createFileRoute("/vehicle/$id")({
  head: () => ({
    meta: [
      { title: "Véhicule — SwapCars AI" },
      { name: "description", content: "Détails et analyse IA du véhicule" },
    ],
  }),
  component: VehicleDetail,
  errorComponent: ({ error }) => <PageShell><div className="p-12 text-center">Erreur : {error.message}</div></PageShell>,
  notFoundComponent: () => <PageShell><div className="p-12 text-center">Véhicule introuvable.</div></PageShell>,
});

function VehicleDetail() {
  const { id } = Route.useParams();
  const { data: car, isLoading } = useQuery({
    queryKey: ["vehicle", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <PageShell><div className="p-12 text-center text-muted-foreground">Chargement…</div></PageShell>;
  if (!car) return <PageShell><div className="p-12 text-center">Véhicule introuvable.</div></PageShell>;

  return (
    <PageShell>
      <section className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        <Link to="/explore" className="text-sm text-muted-foreground hover:text-foreground">← Retour aux véhicules</Link>

        <div className="grid lg:grid-cols-2 gap-10 mt-6">
          <div className="glass rounded-3xl overflow-hidden">
            {car.photos?.[0] ? (
              <img src={car.photos[0]} alt={`${car.brand} ${car.model}`} className="w-full aspect-[16/10] object-cover" />
            ) : (
              <div className="w-full aspect-[16/10] bg-secondary flex items-center justify-center text-6xl">🚗</div>
            )}
            {car.photos && car.photos.length > 1 && (
              <div className="grid grid-cols-4 gap-2 p-2">
                {car.photos.slice(1, 5).map((p: string) => (
                  <img key={p} src={p} alt="" className="aspect-square object-cover rounded-xl" />
                ))}
              </div>
            )}
          </div>

          <div>
            {car.city && <div className="text-xs uppercase tracking-widest text-primary">{car.city}</div>}
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mt-3">{car.brand} {car.model}</h1>
            <p className="text-muted-foreground mt-2">{car.year} • {Number(car.mileage).toLocaleString("fr-FR")} km</p>
            <div className="text-4xl font-black mt-6">{Number(car.price).toLocaleString("fr-FR")} €</div>
            {car.ai_estimate != null && (
              <div className="text-sm text-muted-foreground mt-1">Estimation IA : {Number(car.ai_estimate).toLocaleString("fr-FR")} €</div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-8">
              <Info label="Carburant" v={car.fuel} />
              <Info label="Boîte" v={car.transmission} />
            </div>

            {car.description && (
              <div className="mt-6 text-sm text-muted-foreground whitespace-pre-line">{car.description}</div>
            )}

            <div className="flex gap-3 mt-8">
              <Link to="/chat" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-full text-center font-semibold glow">
                Proposer un échange
              </Link>
              <button className="glass px-6 py-4 rounded-full hover:bg-white/10">♡</button>
            </div>
          </div>
        </div>

        {(car.ai_body_score != null || car.ai_interior_score != null || car.ai_mechanical_score != null) && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-6">Analyse IA</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {car.ai_body_score != null && <Score label="Carrosserie" v={car.ai_body_score} />}
              {car.ai_interior_score != null && <Score label="Intérieur" v={car.ai_interior_score} />}
              {car.ai_mechanical_score != null && <Score label="Mécanique" v={car.ai_mechanical_score} />}
            </div>
            {car.ai_summary && <p className="mt-6 text-muted-foreground text-sm">{car.ai_summary}</p>}
          </div>
        )}
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