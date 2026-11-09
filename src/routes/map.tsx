import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { PageShell } from "@/components/layout/Header";
import { Plus, ArrowLeft, Calendar, MapPin, Users, Car, ChevronRight, X, Search, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";
import { z } from "zod";
import { EventChat } from "@/components/events/EventChat";
import { NearbyCard } from "@/components/events/NearbyCard";
import { useNotifPrefs } from "@/lib/nearby";

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [{ title: "Rassemblements — TORQUE" }] }),
  validateSearch: z.object({ event: z.string().optional(), chat: z.string().optional() }),
  component: () => <RequireAuth><MapPage /></RequireAuth>,
});

type View = "list" | "create" | "detail";
const CATEGORIES = ["Meeting", "Circuit", "Sortie", "Exposition", "Drift", "Drag", "Autre"];
const RULES = [
  "Respect des autres participants et de leurs véhicules",
  "Aucune conduite dangereuse sur le lieu du rassemblement",
  "Stationnement uniquement aux emplacements prévus",
  "Musique à volume raisonnable",
  "Nettoyage de son espace avant de partir",
  "Signalement obligatoire de tout incident à l'organisateur",
];

function MapPage() {
  // Un lien de notification peut ouvrir directement un rasso (?event=...) et sa discussion (&chat=1)
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [view, setView] = useState<View>(search.event ? "detail" : "list");
  const [selectedId, setSelectedId] = useState<string | null>(search.event ?? null);
  const [autoChat, setAutoChat] = useState(!!search.chat);

  useEffect(() => {
    if (search.event) {
      setSelectedId(search.event);
      setView("detail");
      setAutoChat(!!search.chat);
    }
  }, [search.event, search.chat]);

  const backToList = () => {
    setView("list");
    setAutoChat(false);
    if (search.event) navigate({ search: {} });
  };

  if (view === "create") return <CreateEvent onBack={() => setView("list")} />;
  if (view === "detail" && selectedId) return <EventDetail key={selectedId} id={selectedId} initialChat={autoChat} onBack={backToList} />;
  return <EventList onSelect={(id) => { setSelectedId(id); setView("detail"); }} onCreate={() => setView("create")} />;
}

/* ===================== OUTILS ===================== */
type DateRange = "all" | "today" | "weekend" | "month";
type SortMode = "date" | "popular" | "distance";
const RADII = [10, 25, 50, 100];
const SIX_HOURS = 6 * 3600 * 1000;

// Un rasso est « à venir », « en cours », « terminé » ou « annulé ».
function eventPhase(e: any): "upcoming" | "live" | "ended" | "cancelled" {
  if (e.status === "cancelled") return "cancelled";
  const start = new Date(e.starts_at).getTime();
  const end = e.ends_at ? new Date(e.ends_at).getTime() : start + SIX_HOURS;
  const now = Date.now();
  if (now > end) return "ended";
  if (now >= start) return "live";
  return "upcoming";
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function rangeFor(range: DateRange): { from: Date; to: Date } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "today") {
    const to = new Date(today);
    to.setDate(to.getDate() + 1);
    return { from: today, to };
  }
  if (range === "weekend") {
    const from = new Date(today);
    const day = now.getDay(); // 0 = dimanche, 6 = samedi
    if (day === 0) from.setDate(from.getDate() - 1);
    else from.setDate(from.getDate() + (6 - day));
    const to = new Date(from);
    to.setDate(to.getDate() + 2);
    return { from, to };
  }
  if (range === "month") {
    return { from: today, to: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
  }
  return null;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 transition ${
        active
          ? "bg-primary/20 text-primary border border-primary/30"
          : "bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function PhaseBadge({ e }: { e: any }) {
  const phase = eventPhase(e);
  const full = e.attendees_count >= e.max_attendees;
  const base = "text-[10px] font-bold px-2 py-0.5 rounded-full";
  if (phase === "cancelled") return <span className={`${base} bg-red-500/15 text-red-400`}>Annulé</span>;
  if (phase === "ended") return <span className={`${base} bg-white/10 text-muted-foreground`}>Terminé</span>;
  if (phase === "live") return <span className={`${base} bg-green-500/15 text-green-400`}>En cours</span>;
  if (full) return <span className={`${base} bg-amber-500/15 text-amber-400`}>Complet</span>;
  return null;
}

/* ===================== LIST ===================== */
function EventList({ onSelect, onCreate }: { onSelect: (id: string) => void; onCreate: () => void }) {
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");
  const [category, setCategory] = useState("all");
  const [city, setCity] = useState("");
  const [debouncedCity, setDebouncedCity] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [sort, setSort] = useState<SortMode>("date");
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(50);
  const { data: myPrefs } = useNotifPrefs();
  const autoApplied = useRef(false);

  // Détection automatique activée : la liste s'ouvre déjà triée autour de toi
  useEffect(() => {
    if (autoApplied.current || !myPrefs?.auto_locate || myPrefs.home_lat == null || myPrefs.home_lng == null) return;
    autoApplied.current = true;
    setGeo({ lat: myPrefs.home_lat, lng: myPrefs.home_lng });
    setRadius(myPrefs.radius_km ?? 50);
    setSort("distance");
  }, [myPrefs]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedCity(city), 300);
    return () => clearTimeout(t);
  }, [city]);

  // « Près de moi » : la position reste dans le navigateur, elle n'est jamais enregistrée.
  const toggleNearby = () => {
    if (geo) {
      setGeo(null);
      setSort((cur) => (cur === "distance" ? "date" : cur));
      return;
    }
    // Position déjà enregistrée dans les Paramètres : pas besoin de la redemander
    if (myPrefs?.home_lat != null && myPrefs?.home_lng != null) {
      setGeo({ lat: myPrefs.home_lat, lng: myPrefs.home_lng });
      setSort("distance");
      return;
    }
    if (!navigator.geolocation) {
      toast.error("Localisation indisponible sur cet appareil");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSort("distance");
      },
      () => toast.error("Autorise la localisation pour voir les rassos près de toi"),
      { timeout: 10000, maximumAge: 300000 }
    );
  };

  const { data: rawEvents = [], isLoading } = useQuery({
    queryKey: ["events", filter, category, debouncedCity, dateRange, geo?.lat, geo?.lng, radius],
    queryFn: async () => {
      const now = new Date();
      const nowIso = now.toISOString();
      const sixAgo = new Date(now.getTime() - SIX_HOURS).toISOString();
      let q = supabase.from("events").select("*").eq("status", "published");
      if (filter === "upcoming") {
        q = q
          .or(`ends_at.gte.${nowIso},and(ends_at.is.null,starts_at.gte.${sixAgo})`)
          .order("starts_at", { ascending: true });
      } else {
        q = q
          .or(`ends_at.lt.${nowIso},and(ends_at.is.null,starts_at.lt.${sixAgo})`)
          .order("starts_at", { ascending: false });
      }
      const range = filter === "upcoming" ? rangeFor(dateRange) : null;
      if (range) q = q.gte("starts_at", range.from.toISOString()).lt("starts_at", range.to.toISOString());
      if (category !== "all") q = q.eq("category", category.toLowerCase());
      if (debouncedCity.trim()) q = q.ilike("city", `%${debouncedCity.trim()}%`);
      if (geo) {
        const dLat = radius / 111;
        const dLng = radius / (111 * Math.max(0.2, Math.cos((geo.lat * Math.PI) / 180)));
        q = q
          .gte("latitude", geo.lat - dLat)
          .lte("latitude", geo.lat + dLat)
          .gte("longitude", geo.lng - dLng)
          .lte("longitude", geo.lng + dLng);
      }
      const { data } = await q.limit(60);
      return data ?? [];
    },
  });

  const events = useMemo(() => {
    let list = rawEvents.map((e: any) => ({
      ...e,
      _dist: geo ? distanceKm(geo.lat, geo.lng, e.latitude, e.longitude) : null,
    }));
    if (geo) list = list.filter((e: any) => e._dist <= radius);
    if (onlyOpen) list = list.filter((e: any) => e.attendees_count < e.max_attendees);
    if (sort === "popular") list.sort((a: any, b: any) => b.attendees_count - a.attendees_count);
    else if (sort === "distance" && geo) list.sort((a: any, b: any) => a._dist - b._dist);
    return list;
  }, [rawEvents, geo, radius, onlyOpen, sort]);

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-white/5 px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-black">Rassemblements</h1>
            <button onClick={onCreate} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold">
              <Plus className="w-4 h-4" /> Créer
            </button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Rechercher une ville..."
              className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary"
            />
            {city && (
              <button onClick={() => setCity("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="flex gap-2 mb-2">
            {["upcoming", "past"].map(f => (
              <button key={f} onClick={() => { setFilter(f as any); if (f === "past") setDateRange("all"); }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${filter === f ? "bg-primary text-primary-foreground" : "bg-white/5 border border-white/10 text-muted-foreground"}`}>
                {f === "upcoming" ? "À venir" : "Passés"}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {["all", ...CATEGORIES].map(c => (
              <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                {c === "all" ? "Tous" : c}
              </Chip>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pt-2 pb-1 scrollbar-hide">
            {filter === "upcoming" && (
              [
                ["today", "Aujourd'hui"],
                ["weekend", "Ce week-end"],
                ["month", "Ce mois-ci"],
              ] as [DateRange, string][]
            ).map(([r, label]) => (
              <Chip key={r} active={dateRange === r} onClick={() => setDateRange(dateRange === r ? "all" : r)}>
                {label}
              </Chip>
            ))}
            <Chip active={!!geo} onClick={toggleNearby}>Près de moi</Chip>
            <Chip active={onlyOpen} onClick={() => setOnlyOpen(v => !v)}>Places disponibles</Chip>
            <Chip active={sort === "popular"} onClick={() => setSort(sort === "popular" ? (geo ? "distance" : "date") : "popular")}>
              Populaires
            </Chip>
          </div>
          {geo && (
            <div className="flex gap-2 pt-1 overflow-x-auto scrollbar-hide">
              {RADII.map(r => (
                <Chip key={r} active={radius === r} onClick={() => setRadius(r)}>{r} km</Chip>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-4">
          <NearbyCard />
          {isLoading && <Spinner />}
          {!isLoading && events.length === 0 && (
            <div className="text-center py-20">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-bold mb-1">Aucun rassemblement</p>
              <p className="text-sm text-muted-foreground mb-4">
                {geo || dateRange !== "all" || onlyOpen || category !== "all" || debouncedCity
                  ? "Essaie d'élargir tes filtres."
                  : "Organise le premier meeting TORQUE !"}
              </p>
              <button onClick={onCreate} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold text-sm">
                Créer un rassemblement
              </button>
            </div>
          )}
          <div className="space-y-3">
            {events.map((e: any) => (
              <button key={e.id} onClick={() => onSelect(e.id)} className="w-full text-left rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-primary/40 transition">
                {e.cover_url ? (
                  <img src={e.cover_url} alt="" className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Car className="w-10 h-10 text-primary/40" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary uppercase tracking-wide">{e.category}</span>
                        <PhaseBadge e={e} />
                      </div>
                      <h3 className="font-bold text-base mt-0.5">{e.title}</h3>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(e.starts_at)}</span>
                    {e.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{e.city}{e._dist != null ? ` · ${Math.round(e._dist)} km` : ""}</span>}
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{e.attendees_count}/{e.max_attendees}</span>
                  </div>
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
function EventDetail({ id, onBack, initialChat = false }: { id: string; onBack: () => void; initialChat?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showGarage, setShowGarage] = useState<string | null>(null);
  const [showJoin, setShowJoin] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showChat, setShowChat] = useState(initialChat);

  const { data: event } = useQuery({
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
      const { data } = await supabase.from("event_attendees").select("id").eq("event_id", id).eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
  });

  const { data: attendees = [] } = useQuery({
    queryKey: ["attendees", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_attendees")
        .select(`
          user_id,
          vehicle_id,
          profiles!event_attendees_user_id_fkey (
            user_id, display_name, username, avatar_url
          )
        `)
        .eq("event_id", id)
        .limit(50);
      return data ?? [];
    },
  });

  const { data: garage } = useQuery({
    queryKey: ["participant-garage", showGarage],
    enabled: !!showGarage,
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("*").eq("owner_id", showGarage!).limit(10);
      return data ?? [];
    },
  });

  // Véhicules de la personne connectée (pour choisir avec lequel elle vient)
  const { data: myVehicles = [] } = useQuery({
    queryKey: ["my-vehicles", user?.id],
    enabled: !!user && showJoin,
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("*").eq("owner_id", user!.id).limit(20);
      return data ?? [];
    },
  });

  // Véhicules annoncés par les participants (« Visiteur » quand il n'y en a pas)
  const attendeeVehicleIds = attendees.map((a: any) => a.vehicle_id).filter(Boolean);
  const { data: attendeeVehicles = [] } = useQuery({
    queryKey: ["attendee-vehicles", id, attendeeVehicleIds.join(",")],
    enabled: attendeeVehicleIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("id, make, model, year").in("id", attendeeVehicleIds);
      return data ?? [];
    },
  });
  const vehicleById = new Map<string, any>(attendeeVehicles.map((v: any) => [v.id, v]));

  const join = useMutation({
    mutationFn: async (vehicleId: string | null) => {
      if (!user) throw new Error("Connexion requise");
      if (attending) {
        const { error } = await supabase.from("event_attendees").delete().eq("event_id", id).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("event_attendees")
          .insert({ event_id: id, user_id: user.id, vehicle_id: vehicleId });
        if (error) throw error;
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

  // Profil de l'organisateur (pour le bouton « Contacter »)
  const { data: organizer } = useQuery({
    queryKey: ["event-organizer", id],
    enabled: !!event?.organizer_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .eq("user_id", event!.organizer_id)
        .maybeSingle();
      return data;
    },
  });

  // L'organisateur peut annuler son rassemblement
  const cancelEvent = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Connexion requise");
      const { error } = await supabase
        .from("events")
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("organizer_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setShowCancel(false);
      qc.invalidateQueries({ queryKey: ["event", id] });
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Rassemblement annulé");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!event) return <PageShell><Spinner /></PageShell>;

  const phase = eventPhase(event);
  const isPast = phase === "ended";
  const isCancelled = phase === "cancelled";
  const isFull = event.attendees_count >= event.max_attendees;
  const isOrganizer = !!user && event.organizer_id === user.id;
  // La discussion reste ouverte jusqu'à 24 h après la fin du rasso, puis tout est supprimé
  const endMs = event.ends_at ? new Date(event.ends_at).getTime() : new Date(event.starts_at).getTime() + SIX_HOURS;
  const closesAt = endMs + 24 * 3600 * 1000;
  const chatAvailable = (isOrganizer || !!attending) && Date.now() < closesAt;

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">
        <div className="px-4 py-3">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
        </div>

        {event.cover_url ? (
          <img src={event.cover_url} alt="" className="w-full h-52 object-cover" />
        ) : (
          <div className="w-full h-52 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Car className="w-16 h-16 text-primary/30" />
          </div>
        )}

        <div className="px-4 py-4 space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary uppercase tracking-wide">{event.category}</span>
              <PhaseBadge e={event} />
            </div>
            <h1 className="text-2xl font-black mt-1">{event.title}</h1>
          </div>

          {isCancelled && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-300">
              Ce rassemblement a été annulé par l'organisateur.
            </div>
          )}

          {organizer && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <Link
                to="/u/$username"
                params={{ username: organizer.username ?? organizer.user_id }}
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                {organizer.avatar_url ? (
                  <img src={organizer.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {(organizer.display_name ?? organizer.username ?? "?").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Organisateur</p>
                  <p className="font-semibold text-sm truncate">{organizer.display_name ?? organizer.username}</p>
                </div>
              </Link>
              {!isOrganizer && (
                <Link
                  to={"/chat" as any}
                  search={{ with: organizer.user_id } as any}
                  className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex-shrink-0"
                >
                  Contacter
                </Link>
              )}
            </div>
          )}

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

          {event.description && (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-sm leading-relaxed">{event.description}</p>
            </div>
          )}

          {/* Règles */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h3 className="font-bold text-sm mb-3">Règles du rassemblement</h3>
            <ul className="space-y-2">
              {RULES.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                  <span>{r}</span>
                </li>
              ))}
              {event.rules && (
                <li className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="text-primary font-bold mt-0.5">+</span>
                  <span>{event.rules}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Bouton participer */}
          {!isPast && !isCancelled && user && (
            <button
              onClick={() => (attending ? join.mutate(null) : setShowJoin(true))}
              disabled={join.isPending || (!attending && isFull)}
              className={`w-full py-3 rounded-xl font-semibold transition ${
                attending
                  ? "bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-400/30 hover:text-red-400"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {join.isPending ? "..." : attending ? "Je participe · Annuler" : isFull ? "Complet" : "Participer"}
            </button>
          )}

          {/* Discussion du rasso (inscrits + organisateur) */}
          {chatAvailable && (
            <button
              onClick={() => setShowChat(true)}
              className="w-full py-3 rounded-xl border border-primary/30 bg-primary/10 text-primary font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/15 transition"
            >
              <MessageCircle className="w-4 h-4" /> Discussion du rasso
            </button>
          )}
          {!chatAvailable && !isOrganizer && !attending && !isPast && !isCancelled && (
            <p className="text-center text-xs text-muted-foreground">
              Participe pour rejoindre la discussion du rasso.
            </p>
          )}
          {showChat && chatAvailable && user && (
            <EventChat
              eventId={id}
              title={event.title}
              closesAt={closesAt}
              myId={user.id}
              onBack={() => setShowChat(false)}
            />
          )}

          {/* Annulation (organisateur uniquement) */}
          {isOrganizer && !isPast && !isCancelled && (
            <button
              onClick={() => setShowCancel(true)}
              className="w-full py-3 rounded-xl border border-red-400/30 text-red-400 text-sm font-semibold hover:bg-red-500/10 transition"
            >
              Annuler le rassemblement
            </button>
          )}
          {showCancel && (
            <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
              <button className="absolute inset-0 bg-black/60" onClick={() => setShowCancel(false)} aria-label="Fermer" />
              <div className="relative w-full max-w-md bg-[#101319] border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-3">
                <h2 className="font-bold">Annuler ce rassemblement ?</h2>
                <p className="text-xs text-muted-foreground">
                  Il disparaîtra de la liste et plus personne ne pourra s'y inscrire. Cette action est définitive.
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowCancel(false)}
                    className="flex-1 py-3 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold hover:bg-white/10 transition"
                  >
                    Garder
                  </button>
                  <button
                    onClick={() => cancelEvent.mutate()}
                    disabled={cancelEvent.isPending}
                    className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50 transition"
                  >
                    {cancelEvent.isPending ? "..." : "Oui, annuler"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Choix : avec quel véhicule, ou en visiteur */}
          {showJoin && (
            <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
              <button className="absolute inset-0 bg-black/60" onClick={() => setShowJoin(false)} aria-label="Fermer" />
              <div className="relative w-full max-w-md bg-[#101319] border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-3 max-h-[85dvh] overflow-y-auto">
                <h2 className="font-bold">Comment viens-tu ?</h2>
                <p className="text-xs text-muted-foreground">
                  Choisis le véhicule avec lequel tu viens, ou participe en visiteur si tu n'en as pas.
                </p>
                {myVehicles.map((v: any) => (
                  <button
                    key={v.id}
                    onClick={() => { setShowJoin(false); join.mutate(v.id); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-primary/40 transition text-left"
                  >
                    {v.photos?.[0] ? (
                      <img src={v.photos[0]} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                        <Car className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{v.make} {v.model}</p>
                      <p className="text-xs text-muted-foreground">{v.year}</p>
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => { setShowJoin(false); join.mutate(null); }}
                  className="w-full py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 font-semibold text-sm transition"
                >
                  Venir en visiteur (sans véhicule)
                </button>
              </div>
            </div>
          )}

          {/* Participants avec garage */}
          {attendees.length > 0 && (
            <div>
              <h2 className="font-bold mb-3">Participants ({event.attendees_count})</h2>
              <div className="space-y-2">
                {attendees.map((a: any) => {
                  const p = a.profiles;
                  const handle = p?.username ?? a.user_id?.slice(0, 8);
                  const profileParam = p?.username ?? a.user_id;
                  return (
                    <div key={a.user_id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                      <Link to="/u/$username" params={{ username: profileParam }} className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {(p?.display_name ?? "?").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{p?.display_name ?? handle}</p>
                          <p className="text-xs text-muted-foreground">@{handle} · {vehicleById.get(a.vehicle_id) ? `${vehicleById.get(a.vehicle_id).make} ${vehicleById.get(a.vehicle_id).model}` : "Visiteur"}</p>
                        </div>
                      </Link>
                      <button
                        onClick={() => setShowGarage(showGarage === a.user_id ? null : a.user_id)}
                        className="flex items-center gap-1 text-xs text-primary border border-primary/30 px-3 py-1.5 rounded-full hover:bg-primary/10 transition"
                      >
                        <Car className="w-3.5 h-3.5" />
                        Garage
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Garage modal inline */}
          {showGarage && garage && (
            <div className="bg-white/5 border border-primary/20 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm">Garage du participant</h3>
                <button onClick={() => setShowGarage(null)}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              {garage.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Garage vide</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {garage.map((v: any) => (
                    <div key={v.id} className="rounded-xl overflow-hidden bg-white/5 border border-white/10">
                      {v.photos?.[0] ? (
                        <img src={v.photos[0]} alt="" className="w-full aspect-[4/3] object-cover" />
                      ) : (
                        <div className="w-full aspect-[4/3] bg-secondary flex items-center justify-center">
                          <Car className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="p-2">
                        <p className="font-bold text-xs">{v.make} {v.model}</p>
                        <p className="text-xs text-muted-foreground">{v.year}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

/* ===================== CREATE ===================== */
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
    max_attendees: "50",
    rules: "",
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
      max_attendees: parseInt(form.max_attendees) || 50,
      cover_url: coverUrl,
      rules: form.rules || null,
    });

    setSaving(false);
    if (error) { toast.error("Erreur : " + error.message); return; }
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
            <input type="text" value={form.title} onChange={e => set("title", e.target.value)} placeholder="ex: Meeting JDM Bruxelles" className="input-field" />
          </Field>

          <Field label="Catégorie">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => set("category", c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${form.category === c ? "bg-primary text-primary-foreground" : "bg-white/5 border border-white/10 text-muted-foreground"}`}>
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
            <input type="text" value={form.city} onChange={e => set("city", e.target.value)} placeholder="ex: Bruxelles" className="input-field" />
          </Field>

          <Field label="Lieu / Nom du spot">
            <input type="text" value={form.place_name} onChange={e => set("place_name", e.target.value)} placeholder="ex: Parking Ikea Anderlecht" className="input-field" />
          </Field>

          <Field label="Adresse complète">
            <input type="text" value={form.address} onChange={e => set("address", e.target.value)} placeholder="Rue, numéro, code postal" className="input-field" />
          </Field>

          <Field label="Nombre max de participants">
            <input type="number" value={form.max_attendees} onChange={e => set("max_attendees", e.target.value)} min="1" className="input-field" />
          </Field>

          <Field label="Description">
            <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} placeholder="Décris l'événement, le programme..." className="input-field resize-none" />
          </Field>

          <Field label="Règles spécifiques (optionnel)">
            <textarea value={form.rules} onChange={e => set("rules", e.target.value)} rows={2} placeholder="Règles propres à cet événement..." className="input-field resize-none" />
          </Field>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground mb-2">Règles automatiques appliquées</p>
            {RULES.slice(0, 3).map((r, i) => <p key={i} className="mb-1">• {r}</p>)}
            <p className="text-primary">+ {RULES.length - 3} autres règles standard TORQUE</p>
          </div>

          <button onClick={handleSubmit} disabled={saving} className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-3 rounded-xl font-semibold transition">
            {saving ? "Création..." : "Créer le rassemblement"}
          </button>
        </div>
      </div>
      <style>{`.input-field { width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:0.5rem; padding:0.625rem 1rem; font-size:0.875rem; color:inherit; outline:none; } .input-field:focus { border-color:var(--color-primary); }`}</style>
    </PageShell>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>{children}</div>;
}
function Spinner() {
  return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
}