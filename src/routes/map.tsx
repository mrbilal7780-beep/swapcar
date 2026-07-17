import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { PageShell } from "@/components/layout/Header";
import {
  MapPin, Calendar, Users, Plus, ArrowLeft,
  ChevronRight, Clock, Car, X
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [{ title: "Rassemblements — TORQUE" }] }),
  component: () => <RequireAuth><MapPage /></RequireAuth>,
});

type View = "list" | "create" | "detail";

function MapPage() {
  const [view, setView] = useState<View>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (view === "create") return <CreateEvent onBack={() => setView("list")} />;
  if (view === "detail" && selectedId) return <EventDetail id={selectedId} onBack={() => setView("list")} />;

  return <EventList onSelect={(id) => { setSelectedId(id); setView("detail"); }} onCreate={() => setView("create")} />;
}

/* ===================== LIST ===================== */
function EventList({ onSelect, onCreate }: { onSelect: (id: string) => void; onCreate: () => void }) {
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", filter],
    queryFn: async () => {
      const now = new Date().toISOString();
      let q = supabase
        .from("events")
        .select("*")
        .order("starts_at", { ascending: filter === "upcoming" });
      if (filter === "upcoming") q = q.gte("starts_at", now);
      else q = q.lt("starts_at", now);
      const { data } = await q.limit(30);
      return data ?? [];
    },
  });

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-white/5 px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-black">Rassemblements</h1>
            <button
              onClick={onCreate}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary/90 transition"
            >
              <Plus className="w-4 h-4" />
              Créer
            </button>
          </div>
          <div className="flex gap-2">
            <FilterPill active={filter === "upcoming"} onClick={() => setFilter("upcoming")} label="À venir" />
            <FilterPill active={filter === "past"} onClick={() => setFilter("past")} label="Passés" />
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-4">
          {isLoading && <Spinner />}

          {!isLoading && events.length === 0 && (
            <div className="text-center py-20">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-bold mb-1">Aucun rassemblement</p>
              <p className="text-sm text-muted-foreground mb-4">
                Sois le premier à organiser un meeting !
              </p>
              <button
                onClick={onCreate}
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold text-sm"
              >
                Créer un rassemblement
              </button>
            </div>
          )}

          <div className="space-y-3">
            {events.map((e: any) => (
              <button
                key={e.id}
                onClick={() => onSelect(e.id)}
                className="w-full text-left rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-primary/30 transition"
              >
                {e.cover_url ? (
                  <img src={e.cover_url} alt="" className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Car className="w-10 h-10 text-primary/40" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-base leading-tight">{e.title}</h3>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(e.starts_at)}
                    </span>
                    {e.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {e.city}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {e.attendees_count} / {e.max_attendees}
                    </span>
                  </div>
                  {e.place_name && (
                    <p className="text-xs text-muted-foreground mt-1">{e.place_name}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

/* ===================== DETAIL ===================== */
function EventDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  const { data: attending } = useQuery({
    queryKey: ["attending", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_attendees")
        .select("id")
        .eq("event_id", id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  const { data: attendees = [] } = useQuery({
    queryKey: ["attendees", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_attendees")
        .select("user_id, profiles!event_attendees_user_id_fkey(display_name, avatar_url, username)")
        .eq("event_id", id)
        .limit(20);
      return data ?? [];
    },
  });

  const join = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Connexion requise");
      if (attending) {
        await supabase.from("event_attendees").delete().eq("event_id", id).eq("user_id", user.id);
      } else {
        await supabase.from("event_attendees").insert({ event_id: id, user_id: user.id });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attending", id] });
      qc.invalidateQueries({ queryKey: ["event", id] });
      qc.invalidateQueries({ queryKey: ["attendees", id] });
      toast.success(attending ? "Tu ne participes plus" : "Tu participes !");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <PageShell><Spinner /></PageShell>;
  if (!event) return <PageShell><div className="text-center py-20 text-muted-foreground">Événement introuvable</div></PageShell>;

  const isPast = new Date(event.starts_at) < new Date();

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <div className="px-4 py-3">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
        </div>

        {/* Cover */}
        {event.cover_url ? (
          <img src={event.cover_url} alt="" className="w-full h-48 object-cover" />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Car className="w-16 h-16 text-primary/30" />
          </div>
        )}

        <div className="px-4 py-4 space-y-4">
          {/* Title + category */}
          <div>
            <span className="text-xs font-bold text-primary uppercase tracking-wide">{event.category}</span>
            <h1 className="text-2xl font-black mt-1">{event.title}</h1>
          </div>

          {/* Infos */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>{formatDate(event.starts_at)}</span>
            </div>
            {event.city && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>{event.place_name ? `${event.place_name}, ${event.city}` : event.city}</span>
              </div>
            )}
            {event.address && (
              <div className="flex items-start gap-3 text-muted-foreground">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{event.address}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-muted-foreground">
              <Users className="w-4 h-4 flex-shrink-0" />
              <span>{event.attendees_count} participant(s) · max {event.max_attendees}</span>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-sm leading-relaxed">{event.description}</p>
            </div>
          )}

          {/* Bouton participer */}
          {!isPast && user && (
            <button
              onClick={() => join.mutate()}
              disabled={join.isPending}
              className={`w-full py-3 rounded-xl font-semibold transition ${
                attending
                  ? "bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {join.isPending ? "..." : attending ? "✓ Je participe — Annuler" : "Participer"}
            </button>
          )}

          {isPast && (
            <div className="text-center text-sm text-muted-foreground py-2">
              Cet événement est terminé
            </div>
          )}

          {/* Participants */}
          {attendees.length > 0 && (
            <div>
              <h2 className="font-bold mb-3">Participants ({event.attendees_count})</h2>
              <div className="flex flex-wrap gap-2">
                {attendees.map((a: any) => {
                  const p = a.profiles;
                  return (
                    <Link
                      key={a.user_id}
                      to="/u/$username"
                      params={{ username: p?.username ?? a.user_id }}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center text-xs font-bold">
                        {(p?.display_name ?? "?").slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-[10px] text-muted-foreground max-w-[48px] truncate text-center">
                        {p?.username ?? p?.display_name}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

/* ===================== CREATE ===================== */
const CATEGORIES = ["Meeting", "Circuit", "Sortie", "Exposition", "Drag", "Autre"];

function CreateEvent({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const coverRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Meeting",
    city: "",
    place_name: "",
    address: "",
    starts_at: "",
    ends_at: "",
    max_attendees: "100",
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title || !form.starts_at || !form.city) {
      toast.error("Titre, date et ville sont obligatoires");
      return;
    }
    setSaving(true);

    let coverUrl: string | null = null;
    if (coverFile) {
      const ext = coverFile.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("event-covers").upload(path, coverFile, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from("event-covers").getPublicUrl(path);
        coverUrl = data.publicUrl;
      }
    }

    const { error } = await supabase.from("events").insert({
      organizer_id: user!.id,
      title: form.title,
      description: form.description || null,
      category: form.category.toLowerCase(),
      city: form.city,
      place_name: form.place_name || null,
      address: form.address || null,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      max_attendees: parseInt(form.max_attendees) || 100,
      cover_url: coverUrl,
    });

    setSaving(false);

    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }

    toast.success("Rassemblement créé !");
    qc.invalidateQueries({ queryKey: ["events"] });
    onBack();
  };

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center gap-3 py-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/5 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Créer un rassemblement</h1>
        </div>

        <div className="space-y-4 pb-8">
          {/* Cover photo */}
          <button
            onClick={() => coverRef.current?.click()}
            className="w-full h-36 rounded-2xl overflow-hidden bg-white/5 border border-white/10 border-dashed flex items-center justify-center hover:bg-white/10 transition relative"
          >
            {coverPreview ? (
              <img src={coverPreview} alt="" className="w-full h-full object-cover absolute inset-0" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Car className="w-8 h-8" />
                <span className="text-sm">Photo de couverture</span>
              </div>
            )}
          </button>
          <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={e => {
            const f = e.target.files?.[0];
            if (f) { setCoverFile(f); setCoverPreview(URL.createObjectURL(f)); }
          }} />

          <Field label="Titre *">
            <input type="text" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Ex: Meeting JDM Bruxelles" className="input-field" />
          </Field>

          <Field label="Catégorie">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => set("category", c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${form.category === c ? "bg-primary text-primary-foreground" : "bg-white/5 border border-white/10 text-muted-foreground"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date & heure *">
              <input type="datetime-local" value={form.starts_at} onChange={e => set("starts_at", e.target.value)} className="input-field" />
            </Field>
            <Field label="Fin (optionnel)">
              <input type="datetime-local" value={form.ends_at} onChange={e => set("ends_at", e.target.value)} className="input-field" />
            </Field>
          </div>

          <Field label="Ville *">
            <input type="text" value={form.city} onChange={e => set("city", e.target.value)} placeholder="Ex: Bruxelles" className="input-field" />
          </Field>

          <Field label="Lieu / Nom du spot">
            <input type="text" value={form.place_name} onChange={e => set("place_name", e.target.value)} placeholder="Ex: Parking Ikea Anderlecht" className="input-field" />
          </Field>

          <Field label="Adresse complète">
            <input type="text" value={form.address} onChange={e => set("address", e.target.value)} placeholder="Rue, numéro, code postal" className="input-field" />
          </Field>

          <Field label="Max participants">
            <input type="number" value={form.max_attendees} onChange={e => set("max_attendees", e.target.value)} min="1" className="input-field" />
          </Field>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              rows={4}
              placeholder="Décris l'événement, les règles, le programme..."
              className="input-field resize-none"
            />
          </Field>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-3 rounded-xl font-semibold transition"
          >
            {saving ? "Création..." : "Créer le rassemblement"}
          </button>
        </div>
      </div>

      <style>{`
        .input-field {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.5rem;
          padding: 0.625rem 1rem;
          font-size: 0.875rem;
          color: inherit;
          outline: none;
          transition: border-color 0.2s;
        }
        .input-field:focus { border-color: var(--color-primary); }
      `}</style>
    </PageShell>
  );
}

/* ===================== HELPERS ===================== */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FilterPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
        active ? "bg-primary text-primary-foreground" : "bg-white/5 border border-white/10 text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}