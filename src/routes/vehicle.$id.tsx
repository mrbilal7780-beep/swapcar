import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageShell } from "@/components/layout/Header";
import { toast } from "sonner";

export const Route = createFileRoute("/vehicle/$id")({
  head: () => ({
    meta: [
      { title: "Véhicule — Carswap AI" },
      { name: "description", content: "Détails et analyse IA du véhicule" },
    ],
  }),
  component: VehicleDetail,
  errorComponent: ({ error }) => <PageShell><div className="p-12 text-center">Erreur : {error.message}</div></PageShell>,
  notFoundComponent: () => <PageShell><div className="p-12 text-center">Véhicule introuvable.</div></PageShell>,
});

function VehicleDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [active, setActive] = useState(0);
  const { data: car, isLoading } = useQuery({
    queryKey: ["vehicle", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  async function proposeSwap() {
    if (!user) return toast.error("Connectez-vous d'abord");
    const { data: mine } = await supabase.from("vehicles").select("id").eq("owner_id", user.id).limit(1);
    if (!mine || mine.length === 0) return toast.error("Déposez d'abord votre véhicule");
    const { error } = await supabase.from("vehicle_likes").insert({
      liker_user_id: user.id,
      liker_vehicle_id: mine[0].id,
      liked_vehicle_id: car!.id,
    });
    if (error && !error.message.includes("duplicate")) toast.error(error.message);
    else toast.success("Proposition envoyée — vous matcherez si le propriétaire vous like en retour.");
  }

  if (isLoading) return <PageShell><div className="p-12 text-center text-muted-foreground">Chargement…</div></PageShell>;
  if (!car) return <PageShell><div className="p-12 text-center">Véhicule introuvable.</div></PageShell>;

  const photos: string[] = car.photos ?? [];
  const issues: { area: string; location: string; issue: string; severity: string }[] = car.ai_issues?.issues ?? [];
  const strengths: string[] = car.ai_issues?.strengths ?? [];

  return (
    <PageShell>
      <section className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        <Link to="/explore" className="text-sm text-muted-foreground hover:text-foreground">← Retour aux véhicules</Link>

        <div className="grid lg:grid-cols-2 gap-10 mt-6">
          <div className="glass rounded-3xl overflow-hidden">
            {photos[active] ? (
              <img src={photos[active]} alt={`${car.brand} ${car.model}`} className="w-full aspect-[16/10] object-cover" />
            ) : (
              <div className="w-full aspect-[16/10] bg-secondary flex items-center justify-center text-6xl">🚗</div>
            )}
            {photos.length > 1 && (
              <div className="grid grid-cols-5 gap-2 p-2">
                {photos.slice(0, 10).map((p, i) => (
                  <button key={p} onClick={() => setActive(i)} className={`aspect-square rounded-xl overflow-hidden border-2 ${i === active ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"}`}>
                    <img src={p} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            {car.city && <div className="text-xs uppercase tracking-widest text-primary">{car.city}</div>}
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mt-3">{car.brand} {car.model}</h1>
            <p className="text-muted-foreground mt-2">
              {car.year} • {Number(car.mileage).toLocaleString("fr-FR")} km
              {car.generation ? ` • ${car.generation}` : ""}
              {car.color ? ` • ${car.color}` : ""}
            </p>
            <div className="text-4xl font-black mt-6">{Number(car.price).toLocaleString("fr-FR")} €</div>
            {car.ai_estimate != null && (
              <div className="text-sm text-muted-foreground mt-1">
                Estimation IA : <span className="text-foreground font-semibold">{Number(car.ai_estimate).toLocaleString("fr-FR")} €</span>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-8">
              <Info label="Carburant" v={car.fuel} />
              <Info label="Boîte" v={car.transmission} />
              {car.body_type && <Info label="Carrosserie" v={car.body_type} />}
              {car.power_hp != null && <Info label="Puissance" v={`${car.power_hp} ch`} />}
              {car.displacement_cc != null && <Info label="Cylindrée" v={`${car.displacement_cc} cm³`} />}
              {car.cylinders != null && <Info label="Cylindres" v={String(car.cylinders)} />}
              {car.drivetrain && <Info label="Transmission roues" v={car.drivetrain} />}
              {car.gears != null && <Info label="Rapports" v={String(car.gears)} />}
              {car.doors != null && <Info label="Portes" v={String(car.doors)} />}
              {car.seats != null && <Info label="Places" v={String(car.seats)} />}
              {car.owners_count != null && <Info label="Propriétaires" v={String(car.owners_count)} />}
              {car.condition && <Info label="État" v={car.condition} />}
            </div>

            {car.description && (
              <div className="mt-8 text-sm text-muted-foreground whitespace-pre-line">{car.description}</div>
            )}

            <div className="flex gap-3 mt-8">
              {user && user.id !== car.owner_id ? (
                <button onClick={proposeSwap} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-full text-center font-semibold glow">
                  Proposer un échange
                </button>
              ) : !user ? (
                <Link to="/login" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-full text-center font-semibold glow">
                  Se connecter pour proposer
                </Link>
              ) : (
                <div className="flex-1 glass rounded-full py-4 text-center text-sm text-muted-foreground">Votre véhicule</div>
              )}
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
            {car.ai_summary && <p className="mt-6 text-muted-foreground text-sm leading-relaxed">{car.ai_summary}</p>}

            {strengths.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm uppercase tracking-widest text-primary mb-3">Points forts</h3>
                <ul className="grid sm:grid-cols-2 gap-2">
                  {strengths.map((s, i) => (
                    <li key={i} className="glass rounded-xl px-4 py-3 text-sm flex gap-2"><span className="text-primary">✓</span>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {issues.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm uppercase tracking-widest text-primary mb-3">Imperfections détectées</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {issues.map((it, i) => (
                    <div key={i} className="glass rounded-2xl p-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{it.area}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
                          it.severity === "important" ? "bg-destructive/20 text-destructive" :
                          it.severity === "modéré" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-primary/20 text-primary"
                        }`}>{it.severity}</span>
                      </div>
                      <div className="text-sm font-semibold mt-2">{it.location}</div>
                      <div className="text-xs text-muted-foreground mt-1">{it.issue}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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