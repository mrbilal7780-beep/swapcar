import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { activateNearby, geoPermission, getPosition, savePosition, useNotifPrefs } from "@/lib/nearby";

const DISMISS_KEY = "torque_nearby_dismissed_at";
const SEVEN_DAYS = 7 * 24 * 3600 * 1000;

// Invitation à activer la détection des rassos près de soi (une fois, puis plus jamais si activée)
export function NearbyCard({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: prefs, isFetched } = useNotifPrefs();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
      setHidden(Date.now() - at < SEVEN_DAYS);
    } catch {
      setHidden(false);
    }
  }, []);

  const activate = useMutation({
    mutationFn: () => activateNearby(user!.id),
    onSuccess: ({ push }) => {
      toast.success(
        push
          ? "Détection activée : tu seras prévenu des rassos près de toi."
          : "Position enregistrée. Active aussi les notifications dans les Paramètres pour recevoir les alertes."
      );
      qc.invalidateQueries({ queryKey: ["notif-prefs", user!.id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Activation impossible"),
  });

  if (!user || !isFetched || prefs?.auto_locate || hidden) return null;

  const later = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setHidden(true);
  };

  return (
    <div className={`rounded-2xl bg-primary/10 border border-primary/20 p-4 ${compact ? "" : "mb-4"}`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <MapPin className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Rassos près de chez toi</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            Autorise ta position pour être prévenu automatiquement quand un rasso est organisé autour de toi.
            Elle reste privée.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => activate.mutate()}
              disabled={activate.isPending}
              className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
            >
              {activate.isPending ? "…" : "Activer"}
            </button>
            <button onClick={later} className="px-3 py-1.5 rounded-full text-xs font-semibold text-muted-foreground hover:bg-white/5">
              Plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Met la position à jour en silence à l'ouverture de l'app (si la détection est activée et déjà autorisée)
export function LocationSync() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: prefs } = useNotifPrefs();
  const running = useRef(false);

  useEffect(() => {
    if (!user || !prefs?.auto_locate || running.current) return;
    const last = prefs.home_updated_at ? new Date(prefs.home_updated_at).getTime() : 0;
    if (Date.now() - last < 6 * 3600 * 1000) return;
    running.current = true;
    (async () => {
      try {
        if ((await geoPermission()) !== "granted") return;
        const pos = await getPosition(8000);
        await savePosition(user.id, pos);
        qc.invalidateQueries({ queryKey: ["notif-prefs", user.id] });
      } catch {
        /* silencieux : on réessaiera à la prochaine ouverture */
      }
    })();
  }, [user?.id, prefs?.auto_locate, prefs?.home_updated_at, qc]);

  return null;
}
