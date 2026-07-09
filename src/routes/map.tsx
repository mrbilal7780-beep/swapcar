import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/Header";
import { MapPin, Calendar, Users, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [{ title: "Événements — TORQUE" }] }),
  component: MapPage,
});

function MapPage() {
  const [tab, setTab] = useState<"list" | "map">("list");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(50);
      return data ?? [];
    },
  });

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
          <h1 className="text-lg font-bold">Événements</h1>
          <Link
            to="/events/new"
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary/90 transition"
          >
            <Plus className="w-4 h-4" />
            Créer
          </Link>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 border-b border-white/10">
          <button
            onClick={() => setTab("list")}
            className={`py-2.5 text-sm font-semibold transition border-b-2 ${tab === "list" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            Liste
          </button>
          <button
            onClick={() => setTab("map")}
            className={`py-2.5 text-sm font-semibold transition border-b-2 ${tab === "map" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            Carte
          </button>
        </div>

        {tab === "list" && (
          <div className="px-4 py-4">
            {isLoading && (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}

            {!isLoading && events.length === 0 && (
              <div className="text-center py-16">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="font-bold mb-1">Aucun événement à venir</p>
                <p className="text-sm text-muted-foreground mb-4">Sois le premier à organiser un meeting !</p>
                <Link
                  to="/events/new"
                  className="inline-block bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold text-sm"
                >
                  Créer un événement
                </Link>
              </div>
            )}

            <div className="space-y-3">
              {events.map((e: any) => (
                <Link
                  key={e.id}
                  to="/events/$id"
                  params={{ id: e.id }}
                  className="block rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-primary/30 transition"
                >
                  {e.cover_url && (
                    <img src={e.cover_url} alt="" className="w-full h-32 object-cover" />
                  )}
                  {!e.cover_url && (
                    <div className="w-full h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Calendar className="w-8 h-8 text-primary/50" />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-bold">{e.title}</h3>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(e.starts_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {e.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {e.city}
                        </span>
                      )}
                      {e.attendees_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {e.attendees_count}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {tab === "map" && (
          <div className="flex flex-col items-center justify-center py-24 px-8 text-center gap-3">
            <MapPin className="w-12 h-12 text-muted-foreground" />
            <p className="font-bold">Carte bientôt disponible</p>
            <p className="text-sm text-muted-foreground">
              La carte interactive des événements arrive prochainement. En attendant, consulte la liste.
            </p>
            <button
              onClick={() => setTab("list")}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Voir la liste
            </button>
          </div>
        )}
      </div>
    </PageShell>
  );
}