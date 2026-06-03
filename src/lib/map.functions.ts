import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getMapboxToken = createServerFn({ method: "GET" }).handler(async () => {
  const token = process.env.MAPBOX_PUBLIC_TOKEN;
  if (!token) throw new Error("MAPBOX_PUBLIC_TOKEN not configured");
  return { token };
});

export const geocodeCity = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ query: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const token = process.env.MAPBOX_PUBLIC_TOKEN;
    if (!token) throw new Error("MAPBOX_PUBLIC_TOKEN not configured");
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      data.query,
    )}.json?limit=1&types=place,locality,region&access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
    const j = (await res.json()) as { features?: Array<{ center: [number, number]; place_name: string }> };
    const f = j.features?.[0];
    if (!f) return null;
    return { longitude: f.center[0], latitude: f.center[1], place_name: f.place_name };
  });