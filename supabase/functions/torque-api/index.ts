// Fonction serveur TORQUE (Supabase Edge Function) : "torque-api"
// - push        : envoie la notification sur le téléphone (appelée par le webhook de la table app_notifications)
// - media-url   : donne un lien temporaire vers une photo/vidéo de discussion (vue unique respectée)
// - cleanup     : supprime les discussions de rasso terminées depuis plus de 24 h (appelée toutes les heures)
// - delete-account : supprime le compte de la personne connectée
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:contact@torque.app";
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

// Quel réglage de l'utilisateur correspond à quel type de notification
const PREF_BY_TYPE: Record<string, string> = {
  like: "likes",
  comment: "comments",
  follow: "follows",
  message: "messages",
  event_nearby: "events_nearby",
  event_cancelled: "event_updates",
  event_join: "event_updates",
  event_chat: "event_chat",
};

function localHour(tz: string) {
  try {
    const h = new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: tz }).format(new Date());
    return parseInt(h, 10) % 24;
  } catch {
    return new Date().getUTCHours();
  }
}

function inQuietHours(start: number, end: number, hour: number) {
  if (start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

function checkSecret(req: Request) {
  return WEBHOOK_SECRET !== "" && req.headers.get("x-webhook-secret") === WEBHOOK_SECRET;
}

async function sendPush(record: any) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return { sent: 0, skipped: "vapid-missing" };

  const { data: prefs } = await admin.from("notification_prefs").select("*").eq("user_id", record.user_id).maybeSingle();
  if (prefs) {
    if (prefs.push_enabled === false) return { sent: 0, skipped: "push-disabled" };
    const key = PREF_BY_TYPE[record.type];
    if (key && prefs[key] === false) return { sent: 0, skipped: "type-disabled" };
    if (prefs.quiet_enabled && inQuietHours(prefs.quiet_start, prefs.quiet_end, localHour(prefs.tz || "Europe/Brussels"))) {
      return { sent: 0, skipped: "quiet-hours" };
    }
  }

  const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", record.user_id);
  if (!subs?.length) return { sent: 0, skipped: "no-device" };

  const payload = JSON.stringify({
    title: record.title,
    body: record.body ?? "",
    url: record.url ?? "/",
    tag: `${record.type}:${record.entity_id ?? record.id}`,
    icon: "/torque-icon-192.png",
  });

  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        { TTL: 3600, urgency: "normal" },
      );
      sent++;
    } catch (e: any) {
      // Appareil supprimé ou désinscrit : on le retire
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", s.id);
      }
    }
  }
  return { sent };
}

async function userFromRequest(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

async function mediaUrl(req: Request, body: any) {
  const user = await userFromRequest(req);
  if (!user) return json({ error: "Connexion requise" }, 401);
  if (!body.message_id) return json({ error: "Message manquant" }, 400);

  const { data: m } = await admin
    .from("event_messages")
    .select("id, event_id, sender_id, media_path, view_once")
    .eq("id", body.message_id)
    .maybeSingle();
  if (!m || !m.media_path) return json({ error: "Média introuvable" }, 404);

  const { data: ev } = await admin
    .from("events")
    .select("organizer_id, starts_at, ends_at")
    .eq("id", m.event_id)
    .maybeSingle();
  if (!ev) return json({ error: "Rasso introuvable" }, 404);

  const end = ev.ends_at ? new Date(ev.ends_at).getTime() : new Date(ev.starts_at).getTime() + 6 * 3600 * 1000;
  if (Date.now() >= end + 24 * 3600 * 1000) return json({ error: "Discussion terminée" }, 410);

  let allowed = ev.organizer_id === user.id;
  if (!allowed) {
    const { data: att } = await admin
      .from("event_attendees")
      .select("id")
      .eq("event_id", m.event_id)
      .eq("user_id", user.id)
      .maybeSingle();
    allowed = !!att;
  }
  if (!allowed) return json({ error: "Réservé aux participants" }, 403);

  let ttl = 3600;
  if (m.view_once && m.sender_id !== user.id) {
    const { error } = await admin.from("event_message_views").insert({ message_id: m.id, user_id: user.id });
    if (error) {
      if (error.code === "23505") return json({ error: "Déjà ouvert : ce média ne s'ouvre qu'une fois" }, 403);
      return json({ error: "Erreur serveur" }, 500);
    }
    ttl = 30;
  }

  const { data: signed, error: signError } = await admin.storage.from("event-chat").createSignedUrl(m.media_path, ttl);
  if (signError || !signed?.signedUrl) return json({ error: "Fichier indisponible" }, 404);
  return json({ url: signed.signedUrl, view_once: !!m.view_once, ttl });
}

async function cleanup() {
  const { data: rows } = await admin.rpc("expired_event_media");
  const paths = (rows ?? []).map((r: any) => r.media_path).filter(Boolean);
  for (let i = 0; i < paths.length; i += 100) {
    await admin.storage.from("event-chat").remove(paths.slice(i, i + 100));
  }
  const { data: purged } = await admin.rpc("purge_expired_event_messages");
  return { removed_files: paths.length, purged_messages: purged ?? 0 };
}

async function deleteAccount(req: Request, body: any) {
  const user = await userFromRequest(req);
  if (!user) return json({ error: "Connexion requise" }, 401);
  if (body.confirm !== "SUPPRIMER") return json({ error: "Confirmation manquante" }, 400);
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Requête invalide" }, 400);
  }

  try {
    // Webhook de la base : nouvelle ligne dans app_notifications
    if (body?.type === "INSERT" && body?.table === "app_notifications" && body?.record) {
      if (!checkSecret(req)) return json({ error: "Non autorisé" }, 401);
      return json(await sendPush(body.record));
    }
    switch (body?.action) {
      case "media-url":
        return await mediaUrl(req, body);
      case "cleanup":
        if (!checkSecret(req)) return json({ error: "Non autorisé" }, 401);
        return json(await cleanup());
      case "delete-account":
        return await deleteAccount(req, body);
      default:
        return json({ error: "Action inconnue" }, 400);
    }
  } catch (e) {
    console.error("torque-api error", e);
    return json({ error: "Erreur serveur" }, 500);
  }
});
