import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { PageShell } from "@/components/layout/Header";
import { Plus, Car, ArrowLeft, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/garage")({
  head: () => ({ meta: [{ title: "Garage — TORQUE" }] }),
  component: () => <RequireAuth><GaragePage /></RequireAuth>,
});

function GaragePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["my-vehicles", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("*")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate({ to: "/profile" } as any)}
              className="p-2 -ml-2 hover:bg-white/5 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold">Mon Garage</h1>
          </div>
          <Link
            to="/add-vehicle"
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-primary">{vehicles.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Véhicules</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-primary">
              {vehicles.filter((v: any) => v.build_score > 0).length > 0
                ? Math.round(vehicles.reduce((a: number, v: any) => a + (v.build_score ?? 0), 0) / vehicles.length)
                : 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Build Score moyen</div>
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && vehicles.length === 0 && (
          <div className="text-center py-16">
            <Car className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="font-bold mb-1">Aucun véhicule</p>
            <p className="text-sm text-muted-foreground mb-4">
              Ajoute ton premier véhicule à ton garage
            </p>
            <Link
              to="/add-vehicle"
              className="inline-block bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold text-sm"
            >
              Ajouter un véhicule
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {vehicles.map((v: any) => (
            <VehicleRow key={v.id} vehicle={v} />
          ))}
        </div>
      </div>
    </PageShell>
  );
}

function VehicleRow({ vehicle: v }: { vehicle: any }) {
  const qc = useQueryClient();
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteVehicle = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("vehicles").delete().eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Véhicule supprimé");
      qc.invalidateQueries({ queryKey: ["my-vehicles"] });
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  return (
    <div className="relative flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/30 transition">
      <Link to="/vehicle/$id" params={{ id: v.id }} className="flex items-center gap-4 flex-1 min-w-0">
        {v.photos?.[0] ? (
          <img src={v.photos[0]} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
            <Car className="w-8 h-8 text-primary/40" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{v.make} {v.model}</p>
          <p className="text-sm text-muted-foreground">{v.year} · {v.fuel}</p>
          {v.mileage && (
            <p className="text-xs text-muted-foreground">{Number(v.mileage).toLocaleString("fr-FR")} km</p>
          )}
        </div>
        {v.build_score > 0 && (
          <div className="text-right flex-shrink-0">
            <div className="text-lg font-black text-primary">{v.build_score}</div>
            <div className="text-xs text-muted-foreground">score</div>
          </div>
        )}
      </Link>

      <div className="relative flex-shrink-0">
        <button
          onClick={() => setShowMenu((s) => !s)}
          className="p-2 hover:bg-white/10 rounded-full transition"
        >
          <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
        </button>
        {showMenu && (
          <div className="absolute right-0 top-10 bg-card border border-white/10 rounded-xl shadow-xl z-10 overflow-hidden min-w-[160px]">
            <Link
              to="/add-vehicle"
              search={{ edit: v.id }}
              onClick={() => setShowMenu(false)}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-white/5 transition"
            >
              <Pencil className="w-4 h-4" />
              Modifier
            </Link>
            <button
              onClick={() => { setConfirmDelete(true); setShowMenu(false); }}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
          </div>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce véhicule ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive. {v.make} {v.model} sera retiré de ton garage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteVehicle.mutate()}
              className="bg-red-600 text-white hover:bg-red-600/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}