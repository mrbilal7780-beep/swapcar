import { supabase } from "@/integrations/supabase/client";

// Clé publique d'envoi des notifications (publique par nature, la clé privée reste dans Supabase).
export const VAPID_PUBLIC_KEY = "BEXvpoJuGjpDS2GELLYqH1oyTF7GhCVMH3ru6omAJ5xkGD_eDqxRWgW2XAp5osfZDQWrEgJBxdXEmiSzsa8c6GU";

export type PushState = "unsupported" | "denied" | "enabled" | "disabled";

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    return sub && Notification.permission === "granted" ? "enabled" : "disabled";
  } catch {
    return "disabled";
  }
}

export async function enablePush(): Promise<void> {
  if (!pushSupported()) {
    throw new Error(
      "Les notifications ne sont pas disponibles ici. Sur iPhone, ajoute d'abord TORQUE à l'écran d'accueil."
    );
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notifications refusées. Tu peux les autoriser dans les réglages de ton navigateur.");
  }
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });
  }
  const json = sub.toJSON();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys?.p256dh,
    p_auth: json.keys?.auth,
    p_ua: navigator.userAgent.slice(0, 200),
  });
  if (error) throw error;
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await supabase.rpc("remove_push_subscription", { p_endpoint: sub.endpoint });
    await sub.unsubscribe();
  }
}

// Appelle la fonction serveur TORQUE (photos privées, suppression de compte).
export async function callApi<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("torque-api", { body: { action, ...payload } });
  if (error) {
    let message = error.message;
    try {
      const body = await (error as any).context?.json?.();
      if (body?.error) message = body.error;
      else if (body?.message) message = body.message;
    } catch {
      /* garde le message par défaut */
    }
    throw new Error(message);
  }
  return data as T;
}
