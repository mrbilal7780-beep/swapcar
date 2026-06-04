import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAPBOX = (q: string, token: string) =>
  `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?limit=1&access_token=${token}`;

export const createEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        title: z.string().min(3).max(120),
        description: z.string().max(4000).optional(),
        cover_url: z.string().url().optional(),
        category: z.enum(["meetup", "track", "show", "cruise", "rally", "other"]).default("meetup"),
        location_query: z.string().min(2).max(200),
        starts_at: z.string().min(1),
        ends_at: z.string().optional().nullable(),
        max_attendees: z.number().int().min(1).max(100000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const token = process.env.MAPBOX_PUBLIC_TOKEN;
    if (!token) throw new Error("MAPBOX_PUBLIC_TOKEN not configured");
    const res = await fetch(MAPBOX(data.location_query, token));
    if (!res.ok) throw new Error("Geocoding failed");
    const j = (await res.json()) as { features?: Array<{ center: [number, number]; place_name: string; context?: any[] }> };
    const f = j.features?.[0];
    if (!f) throw new Error("Lieu introuvable");
    const cityCtx = (f.context ?? []).find((c: any) => c.id?.startsWith("place"));
    const { data: ev, error } = await supabase
      .from("events")
      .insert({
        organizer_id: userId,
        title: data.title,
        description: data.description ?? null,
        cover_url: data.cover_url ?? null,
        category: data.category,
        place_name: f.place_name,
        city: cityCtx?.text ?? null,
        latitude: f.center[1],
        longitude: f.center[0],
        starts_at: data.starts_at,
        ends_at: data.ends_at || null,
        max_attendees: data.max_attendees || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: ev.id };
  });

export const rsvpEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ event_id: z.string().uuid(), going: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.going) {
      const { error } = await supabase
        .from("event_attendees")
        .upsert({ event_id: data.event_id, user_id: userId, status: "going" }, { onConflict: "event_id,user_id" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("event_attendees")
        .delete()
        .eq("event_id", data.event_id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });