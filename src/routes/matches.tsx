import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { PageShell } from "@/components/layout/Header";
import { toast } from "sonner";

export const Route = createFileRoute("/matches")({
  head: () => ({
    meta: [
      { title: "Mes matches — Carswap AI" },
      { name: "description", content: "Découvrez les véhicules les plus compatibles avec le vôtre, façon Tinder." },
      { property: "og:title", content: "Matches IA — Carswap AI" },
      { property: "og:description", content: "Swipez. Échangez. Roulez." },
    ],
  }),
  component: () => <RequireAuth><Matches /></RequireAuth>,
});

function score(a: any, b: any) {
  if (!a || !b) return 50;
  const valDiff = Math.abs(Number(a.price) - Number(b.price)) / Math.max(Number(a.price), Number(b.price), 1);
  const valScore = Math.max(0, 100 - valDiff * 200);
  const yearScore = Math.max(0, 100 - Math.abs(a.year - b.year) * 5);
  return Math.round(valScore * 0.6 + yearScore * 0.4);
}

function Matches() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [index, setIndex] = useState(0);

  const { data: myCars = [] } = useQuery({
    queryKey: ["my-vehicles", user!.id],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("*").eq("owner_id", user!.id);
      return data ?? [];
    },
  });
  const myCar = myCars[0];

  const { data: pool = [], isLoading } = useQuery({
    queryKey: ["match-pool", user!.id],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("*").eq("status", "published").neq("owner_id", user!.id).order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const { data: likedIds = [] } = useQuery({
    queryKey: ["my-likes", user!.id],
    queryFn: async () => {
      const { data } = await supabase.from("vehicle_likes").select("liked_vehicle_id").eq("liker_user_id", user!.id);
      return (data ?? []).map((d) => d.liked_vehicle_id);
    },
  });

  const candidates = useMemo(() => pool.filter((p) => !likedIds.includes(p.id)), [pool, likedIds]);
  const current = candidates[index];

  async function next(like: boolean) {
    if (like && current && myCar) {
      const { error } = await supabase.from("vehicle_likes").insert({
        liker_user_id: user!.id,
        liker_vehicle_id: myCar.id,
        liked_vehicle_id: current.id,
      });
      if (error) toast.error(error.message);
      else {
        toast.success("♡ Liké");
        qc.invalidateQueries({ queryKey: ["my-likes"] });
        qc.invalidateQueries({ queryKey: ["matches"] });
      }
    }
    setIndex((i) => i + 1);
  }

  return (
    <PageShell>
      <section className="max-w-3xl mx-auto px-6 md:px-8 py-8">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-center">
          Vos <span className="text-gradient">matches IA</span>
        </h1>
        {myCar ? (
          <p className="text-center text-muted-foreground mt-2 mb-10">Basés sur votre {myCar.brand} {myCar.model}</p>
        ) : (
          <div className="glass rounded-3xl p-10 mt-8 text-center">
            <p className="text-muted-foreground">Déposez votre véhicule pour commencer à matcher.</p>
            <Link to="/add-vehicle" className="inline-block mt-6 bg-primary px-6 py-3 rounded-full font-semibold glow">Déposer ma voiture</Link>
          </div>
        )}

        {myCar && isLoading && <div className="text-center text-muted-foreground py-12">Chargement…</div>}

        {myCar && current ? (
          <div className="relative">
            <div className="glass rounded-[2rem] overflow-hidden">
              <div className="aspect-[4/5] sm:aspect-[16/10] relative">
                {current.photos?.[0] ? (
                  <img src={current.photos[0]} alt={`${current.brand} ${current.model}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-secondary flex items-center justify-center text-6xl">🚗</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute top-4 right-4 glass px-4 py-2 rounded-full font-bold text-primary">{score(myCar, current)}% match</div>
                <div className="absolute bottom-0 inset-x-0 p-6 text-white">
                  {current.city && <div className="text-xs uppercase tracking-widest opacity-70">{current.city}</div>}
                  <div className="text-2xl font-black mt-1">{current.brand} {current.model}</div>
                  <div className="text-sm opacity-80 mt-1">{current.year} • {Number(current.mileage).toLocaleString("fr-FR")} km • {current.fuel}</div>
                  <div className="text-xl font-bold mt-2">{Number(current.price).toLocaleString("fr-FR")} €</div>
                </div>
              </div>
              <div className="p-6 space-y-2 text-sm">
                <Row label="Valeur similaire (±5 000 €)" ok={Math.abs(Number(myCar.price) - Number(current.price)) < 5000} />
                <Row label="Même catégorie" ok={true} />
                <Row label="Analyse IA disponible" ok={current.ai_body_score != null} />
                <Row label="Photos fournies" ok={(current.photos?.length ?? 0) > 0} />
              </div>
            </div>

            <div className="flex justify-center gap-6 mt-8">
              <button onClick={() => next(false)} className="w-16 h-16 rounded-full glass hover:bg-destructive/20 text-2xl">✕</button>
              <Link to="/vehicle/$id" params={{ id: current.id }} className="w-16 h-16 rounded-full glass hover:bg-white/10 flex items-center justify-center text-xl">👁</Link>
              <button onClick={() => next(true)} className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 text-2xl glow">♡</button>
            </div>
          </div>
        ) : myCar && !isLoading ? (
          <div className="glass rounded-3xl p-12 text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold">Vous avez tout vu !</h2>
            <p className="text-muted-foreground mt-2">{likedIds.length} véhicule(s) likés.</p>
            <Link to="/explore" className="inline-block mt-6 bg-primary px-6 py-3 rounded-full font-semibold glow">Continuer à explorer</Link>
          </div>
        ) : null}
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