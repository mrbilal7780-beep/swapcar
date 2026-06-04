import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/Header";
import { useAuth } from "@/lib/auth";
import { rsvpEvent } from "@/lib/events.functions";

export const Route = createFileRoute("/events/$id")({
  head: () => ({ meta: [{ title: "Événement — SwapCars AI" }] }),
  component: EventDetail,
});

type Ev = {
  id: string;
  organizer_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  category: string;
  city: string | null;
  place_name: string | null;
  latitude: number;
  longitude: number;
  starts_at: string;
  ends_at: string | null;
  attendees_count: number;
  max_attendees: number | null;
};

type Attendee = { user_id: string; profiles?: { display_name: string | null; avatar_url: string | null; username: string | null } | null };

function EventDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const rsvp = useServerFn(rsvpEvent);
  const [ev, setEv] = useState<Ev | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [going, setGoing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const { data: e } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
    setEv((e as any) ?? null);
    const { data: a } = await supabase
      .from("event_attendees")
      .select("user_id")
      .eq("event_id", id)
      .limit(50);
    const list = (a ?? []) as Attendee[];
    setAttendees(list);
    setGoing(!!user && list.some((x) => x.user_id === user.id));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  async function toggle() {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setBusy(true);
    try {
      await rsvp({ data: { event_id: id, going: !going } });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!ev) {
    return (
      <PageShell>
        <section className="max-w-3xl mx-auto px-6 py-16 text-muted-foreground">Chargement…</section>
      </PageShell>
    );
  }

  const d = new Date(ev.starts_at);
  const full = ev.max_attendees ? ev.attendees_count >= ev.max_attendees : false;

  return (
    <PageShell>
      <section className="max-w-4xl mx-auto px-6 md:px-8 py-8">
        <div className="aspect-[21/9] rounded-3xl overflow-hidden bg-gradient-to-br from-primary/30 to-secondary/30 relative">
          {ev.cover_url && <img src={ev.cover_url} alt={ev.title} className="absolute inset-0 w-full h-full object-cover" />}
        </div>

        <div className="mt-6 flex flex-col md:flex-row gap-6 md:items-start justify-between">
          <div className="flex-1">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              {d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} ·{" "}
              {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight mt-2">{ev.title}</h1>
            <div className="text-muted-foreground mt-2">{ev.place_name ?? ev.city ?? "—"}</div>
          </div>

          <div className="glass rounded-2xl p-5 md:w-72">
            <div className="text-3xl font-black">
              {ev.attendees_count}
              {ev.max_attendees && <span className="text-muted-foreground text-base font-normal"> / {ev.max_attendees}</span>}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-widest">participants</div>
            <button
              onClick={toggle}
              disabled={busy || (!going && full)}
              className={`mt-4 w-full py-3 rounded-xl font-semibold transition ${
                going ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground glow"
              } disabled:opacity-50`}
            >
              {busy ? "…" : going ? "✓ Je viens" : full ? "Complet" : "Je participe"}
            </button>
            <a
              href={`https://www.openstreetmap.org/?mlat=${ev.latitude}&mlon=${ev.longitude}#map=15/${ev.latitude}/${ev.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block text-center text-xs text-muted-foreground hover:text-foreground"
            >
              Voir l'itinéraire ↗
            </a>
          </div>
        </div>

        {ev.description && (
          <div className="mt-8 prose prose-invert max-w-none whitespace-pre-wrap text-foreground/90 leading-relaxed">
            {ev.description}
          </div>
        )}

        <div className="mt-8">
          <Link to="/map" className="text-sm text-primary hover:underline">
            ← Voir sur la carte
          </Link>
        </div>
      </section>
    </PageShell>
  );
}