import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/Header";

export const Route = createFileRoute("/events/")({
  head: () => ({
    meta: [
      { title: "Événements auto — SwapCars AI" },
      { name: "description", content: "Meetings, sorties circuit et rassemblements automobiles près de chez toi." },
    ],
  }),
  component: EventsPage,
});

type Ev = {
  id: string;
  title: string;
  cover_url: string | null;
  category: string;
  city: string | null;
  place_name: string | null;
  starts_at: string;
  attendees_count: number;
  max_attendees: number | null;
};

const CAT_LABEL: Record<string, string> = {
  meetup: "Meetup",
  track: "Circuit",
  show: "Salon",
  cruise: "Cruise",
  rally: "Rallye",
  other: "Autre",
};

function EventsPage() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, cover_url, category, city, place_name, starts_at, attendees_count, max_attendees")
        .eq("status", "published")
        .gte("starts_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
        .order("starts_at", { ascending: true })
        .limit(60);
      setEvents((data ?? []) as Ev[]);
      setLoading(false);
    })();
  }, []);

  return (
    <PageShell>
      <section className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight">
              Événements <span className="text-gradient">auto</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Meetings, sorties circuit, cruises et rassemblements de la communauté.
            </p>
          </div>
          <Link
            to="/events/new"
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold glow"
          >
            + Créer un événement
          </Link>
        </div>

        {loading ? (
          <p className="text-muted-foreground mt-12">Chargement…</p>
        ) : events.length === 0 ? (
          <div className="mt-12 text-center text-muted-foreground border border-dashed border-white/10 rounded-3xl py-16">
            Aucun événement à venir. Sois le premier à organiser un meeting !
          </div>
        ) : (
          <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((e) => {
              const d = new Date(e.starts_at);
              return (
                <Link
                  key={e.id}
                  to="/events/$id"
                  params={{ id: e.id }}
                  className="group rounded-2xl overflow-hidden border border-white/10 bg-card hover:border-primary/40 transition"
                >
                  <div className="aspect-[16/10] bg-gradient-to-br from-primary/20 to-secondary/20 relative">
                    {e.cover_url && (
                      <img src={e.cover_url} alt={e.title} className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    <div className="absolute top-3 left-3 bg-background/80 backdrop-blur px-2.5 py-1 rounded-full text-[10px] uppercase tracking-widest">
                      {CAT_LABEL[e.category] ?? e.category}
                    </div>
                    <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur px-3 py-2 rounded-xl">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {d.toLocaleDateString("fr-FR", { weekday: "short" })}
                      </div>
                      <div className="font-bold text-lg leading-none">
                        {d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="font-bold group-hover:text-primary transition line-clamp-2">{e.title}</div>
                    <div className="text-sm text-muted-foreground mt-1 line-clamp-1">{e.city ?? e.place_name ?? "—"}</div>
                    <div className="mt-3 text-xs text-muted-foreground flex justify-between">
                      <span>{d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                      <span>
                        {e.attendees_count} participant{e.attendees_count > 1 ? "s" : ""}
                        {e.max_attendees ? ` / ${e.max_attendees}` : ""}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </PageShell>
  );
}