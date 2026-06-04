import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://swapcar.lovable.app";

interface Entry {
  path: string;
  changefreq?: "daily" | "weekly" | "monthly";
  priority?: string;
}

const STATIC: Entry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/explore", changefreq: "daily", priority: "0.9" },
  { path: "/map", changefreq: "daily", priority: "0.8" },
  { path: "/events", changefreq: "daily", priority: "0.8" },
  { path: "/feed", changefreq: "daily", priority: "0.7" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: Entry[] = [...STATIC];
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const [{ data: vehicles }, { data: events }, { data: profiles }] = await Promise.all([
            supabaseAdmin.from("vehicles").select("id, updated_at").eq("status", "published").limit(1000),
            supabaseAdmin.from("events").select("id, updated_at").eq("status", "published").limit(1000),
            supabaseAdmin.from("profiles").select("username, updated_at").not("username", "is", null).limit(1000),
          ]);
          for (const v of vehicles ?? []) entries.push({ path: `/vehicle/${v.id}`, changefreq: "weekly", priority: "0.7" });
          for (const e of events ?? []) entries.push({ path: `/events/${e.id}`, changefreq: "weekly", priority: "0.7" });
          for (const p of profiles ?? []) if (p.username) entries.push({ path: `/u/${p.username}`, changefreq: "weekly", priority: "0.6" });
        } catch (err) {
          console.error("sitemap dynamic fetch failed", err);
        }

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...entries.map((e) =>
            [
              `  <url>`,
              `    <loc>${BASE_URL}${e.path}</loc>`,
              e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
              e.priority ? `    <priority>${e.priority}</priority>` : null,
              `  </url>`,
            ]
              .filter(Boolean)
              .join("\n"),
          ),
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});