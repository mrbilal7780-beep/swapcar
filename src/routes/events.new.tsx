import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PageShell } from "@/components/layout/Header";
import { createEvent } from "@/lib/events.functions";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/events/new")({
  head: () => ({ meta: [{ title: "Créer un événement — Carswap AI" }] }),
  component: NewEventPage,
});

function NewEventPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const create = useServerFn(createEvent);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <PageShell>
        <section className="max-w-xl mx-auto px-6 py-16 text-center">
          <h1 className="text-3xl font-black">Connecte-toi pour créer un événement</h1>
          <a href="/login" className="mt-6 inline-block bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold">
            Se connecter
          </a>
        </section>
      </PageShell>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const max = fd.get("max_attendees")?.toString();
      const ends = fd.get("ends_at")?.toString();
      const res = await create({
        data: {
          title: fd.get("title")!.toString(),
          description: fd.get("description")?.toString() || undefined,
          category: fd.get("category")!.toString() as any,
          location_query: fd.get("location_query")!.toString(),
          starts_at: new Date(fd.get("starts_at")!.toString()).toISOString(),
          ends_at: ends ? new Date(ends).toISOString() : null,
          max_attendees: max ? Number(max) : null,
          cover_url: fd.get("cover_url")?.toString() || undefined,
        },
      });
      navigate({ to: "/events/$id", params: { id: res.id } });
    } catch (err: any) {
      setError(err.message ?? "Erreur");
      setSubmitting(false);
    }
  }

  const inputCls = "w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary";

  return (
    <PageShell>
      <section className="max-w-2xl mx-auto px-6 md:px-8 py-8">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          Créer un <span className="text-gradient">événement</span>
        </h1>
        <p className="text-muted-foreground mt-2">Rassemble la communauté autour de ta passion.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Titre</label>
            <input name="title" required minLength={3} maxLength={120} className={inputCls + " mt-2"} placeholder="Meeting JDM Paris" />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Catégorie</label>
            <select name="category" className={inputCls + " mt-2"} defaultValue="meetup">
              <option value="meetup">Meetup</option>
              <option value="track">Circuit</option>
              <option value="show">Salon</option>
              <option value="cruise">Cruise</option>
              <option value="rally">Rallye</option>
              <option value="other">Autre</option>
            </select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Lieu</label>
            <input name="location_query" required className={inputCls + " mt-2"} placeholder="Place de la Concorde, Paris" />
            <p className="text-xs text-muted-foreground mt-1">Adresse ou ville — localisé automatiquement sur la carte.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Début</label>
              <input name="starts_at" type="datetime-local" required className={inputCls + " mt-2"} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Fin (optionnel)</label>
              <input name="ends_at" type="datetime-local" className={inputCls + " mt-2"} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Capacité max (optionnel)</label>
              <input name="max_attendees" type="number" min={1} className={inputCls + " mt-2"} placeholder="50" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Image de couverture (URL)</label>
              <input name="cover_url" type="url" className={inputCls + " mt-2"} placeholder="https://…" />
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Description</label>
            <textarea name="description" rows={5} maxLength={4000} className={inputCls + " mt-2 resize-none"} placeholder="Programme, briefing, conditions…" />
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-semibold transition glow disabled:opacity-50"
          >
            {submitting ? "Création…" : "Publier l'événement"}
          </button>
        </form>
      </section>
    </PageShell>
  );
}