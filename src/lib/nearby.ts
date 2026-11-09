import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { enablePush, pushSupported } from "@/lib/push";

export type GeoPermission = "granted" | "prompt" | "denied" | "unsupported";

const round = (n: number) => Math.round(n * 1000) / 1000; // ~110 m : assez précis pour les rassos, pas pour te localiser

export async function geoPermission(): Promise<GeoPermission> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return "unsupported";
  try {
    const status = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    return ((status?.state as GeoPermission) ?? "prompt");
  } catch {
    return "prompt";
  }
}

export function getPosition(timeout = 12000): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("La localisation n'est pas disponible sur cet appareil."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: round(pos.coords.latitude), lng: round(pos.coords.longitude) }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "Localisation refusée. Autorise-la dans les réglages du site (cadenas dans la barre d'adresse)."
              : "Position introuvable, réessaie dans un instant."
          )
        ),
      { timeout, maximumAge: 300000, enableHighAccuracy: false }
    );
  });
}

export async function savePosition(userId: string, pos: { lat: number; lng: number }, extra: Record<string, unknown> = {}) {
  const { error } = await supabase.from("notification_prefs").upsert(
    {
      user_id: userId,
      home_lat: pos.lat,
      home_lng: pos.lng,
      home_label: "Position automatique",
      home_updated_at: new Date().toISOString(),
      ...extra,
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

// Active la détection : position + alertes rassos + (si possible) notifications sur l'appareil.
export async function activateNearby(userId: string): Promise<{ push: boolean }> {
  const pos = await getPosition();
  await savePosition(userId, pos, { auto_locate: true, events_nearby: true });
  let push = false;
  if (pushSupported() && Notification.permission !== "denied") {
    try {
      await enablePush();
      push = true;
    } catch {
      push = false;
    }
  }
  return { push };
}

export async function deactivateNearby(userId: string) {
  const { error } = await supabase.from("notification_prefs").upsert(
    { user_id: userId, auto_locate: false, home_lat: null, home_lng: null, home_label: null, home_updated_at: null },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export type NotifPrefsRow = {
  auto_locate: boolean;
  home_lat: number | null;
  home_lng: number | null;
  home_updated_at: string | null;
  radius_km: number;
};

// Réglages de notification de la personne connectée (partagés par tous les écrans)
export function useNotifPrefs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notif-prefs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("notification_prefs").select("*").eq("user_id", user!.id).maybeSingle();
      return data as (NotifPrefsRow & Record<string, any>) | null;
    },
  });
}
