import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/Header";
import { ArrowLeft, Car, Calendar, Gauge, Fuel, Hash } from "lucide-react";

export const Route = createFileRoute("/vehicle/$id")({
  head: () => ({ meta: [{ title: "Véhicule — TORQUE" }] }),
  component: VehicleDetail,
});

function VehicleDetail() {
  const { id } = Route.useParams();

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ["vehicle", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("*, profiles!vehicles_owner_id_fkey(user_id, display_name, username, avatar_url)")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </PageShell>
    );
  }

  if (!vehicle) {
    return (
      <PageShell>
        <div className="text-center py-20 text-muted-foreground">Véhicule introuvable</div>
      </PageShell>
    );
  }

  const owner = vehicle.profiles;
  const ownerHandle = owner?.username ?? owner?.user_id?.slice(0, 8);
  const ownerProfileParam = owner?.username ?? owner?.user_id;

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <div className="px-4 py-3">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
        </div>

        {/* Photos */}
        {vehicle.photos?.length > 0 ? (
          <div className={`grid gap-[2px] ${vehicle.photos.length > 1 ? "grid-cols-2" : ""}`}>
            {vehicle.photos.slice(0, 4).map((url: string, i: number) => (
              <img key={i} src={url} alt="" className="w-full aspect-square object-cover" />
            ))}
          </div>
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Car className="w-16 h-16 text-primary/30" />
          </div>
        )}

        <div className="px-4 py-4 space-y-4">
          {/* Title */}
          <div>
            <h1 className="text-2xl font-black">{vehicle.make} {vehicle.model}</h1>
            {vehicle.price && (
              <p className="text-xl font-bold text-primary mt-1">
                {Number(vehicle.price).toLocaleString("fr-FR")} €
              </p>
            )}
          </div>

          {/* Specs */}
          <div className="grid grid-cols-2 gap-3">
            {vehicle.year && (
              <SpecCard icon={Calendar} label="Année" value={vehicle.year} />
            )}
            {vehicle.mileage && (
              <SpecCard icon={Gauge} label="Kilométrage" value={`${Number(vehicle.mileage).toLocaleString("fr-FR")} km`} />
            )}
            {vehicle.fuel && (
              <SpecCard icon={Fuel} label="Carburant" value={vehicle.fuel} />
            )}
            {vehicle.vin && (
              <SpecCard icon={Hash} label="VIN" value={vehicle.vin} />
            )}
          </div>

          {/* Build score */}
          {vehicle.build_score > 0 && (
            <div className="bg-gradient-to-r from-primary/20 to-primary/10 rounded-xl p-4 border border-primary/20">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Build Score</p>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-black text-primary">{vehicle.build_score}</div>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                    style={{ width: `${vehicle.build_score}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
            </div>
          )}

          {/* Owner */}
          {owner && (
            <div className="border-t border-white/5 pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Propriétaire</p>
              <Link
                to="/u/$username"
                params={{ username: ownerProfileParam! }}
                className="flex items-center gap-3 hover:opacity-80 transition"
              >
                {owner.avatar_url ? (
                  <img src={owner.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center font-bold">
                    {(owner.display_name ?? "?").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold">{owner.display_name ?? ownerHandle}</p>
                  <p className="text-sm text-muted-foreground">@{ownerHandle}</p>
                </div>
                <span className="ml-auto text-sm text-primary">Voir profil →</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function SpecCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-bold text-sm">{value}</p>
    </div>
  );
}