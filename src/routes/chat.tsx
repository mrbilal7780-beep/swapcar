import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { PageShell } from "@/components/layout/Header";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Messages — Carswap AI" },
      { name: "description", content: "Négociez vos échanges en temps réel." },
      { property: "og:title", content: "Messages — Carswap AI" },
      { property: "og:description", content: "Discutez. Négociez. Échangez." },
    ],
  }),
  component: () => <RequireAuth><Chat /></RequireAuth>,
});

type Match = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  vehicle_a_id: string;
  vehicle_b_id: string;
  created_at: string;
  other: { id: string; display_name: string | null; avatar_url: string | null };
  otherVehicle: { id: string; brand: string; model: string; photos: string[]; city: string | null };
};

function Chat() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: matches = [] } = useQuery({
    queryKey: ["matches", user!.id],
    queryFn: async () => {
      const { data: ms } = await supabase
        .from("matches")
        .select("*")
        .order("created_at", { ascending: false });
      if (!ms || ms.length === 0) return [] as Match[];
      const otherIds = ms.map((m) => (m.user_a_id === user!.id ? m.user_b_id : m.user_a_id));
      const otherVehicleIds = ms.map((m) => (m.user_a_id === user!.id ? m.vehicle_b_id : m.vehicle_a_id));
      const [profs, vehs] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", otherIds),
        supabase.from("vehicles").select("id, brand, model, photos, city").in("id", otherVehicleIds),
      ]);
      const pmap = new Map((profs.data ?? []).map((p) => [p.user_id, p]));
      const vmap = new Map((vehs.data ?? []).map((v) => [v.id, v]));
      return ms.map<Match>((m) => {
        const otherUserId = m.user_a_id === user!.id ? m.user_b_id : m.user_a_id;
        const otherVehicleId = m.user_a_id === user!.id ? m.vehicle_b_id : m.vehicle_a_id;
        const p = pmap.get(otherUserId);
        const v = vmap.get(otherVehicleId);
        return {
          ...m,
          other: { id: otherUserId, display_name: p?.display_name ?? "Utilisateur", avatar_url: p?.avatar_url ?? null },
          otherVehicle: { id: otherVehicleId, brand: v?.brand ?? "", model: v?.model ?? "", photos: (v?.photos as string[]) ?? [], city: v?.city ?? null },
        };
      });
    },
  });

  // auto-select first match
  useEffect(() => {
    if (!activeId && matches.length > 0) setActiveId(matches[0].id);
  }, [matches, activeId]);

  const active = matches.find((m) => m.id === activeId) ?? null;

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data } = await supabase.from("messages").select("*").eq("match_id", activeId!).order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  // realtime subscription for active match
  useEffect(() => {
    if (!activeId) return;
    const channel = supabase
      .channel(`messages:${activeId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${activeId}` }, () => {
        qc.invalidateQueries({ queryKey: ["messages", activeId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    if (!input.trim() || !activeId) return;
    const text = input.trim();
    setInput("");
    const { error } = await supabase.from("messages").insert({
      match_id: activeId,
      sender_id: user!.id,
      content: text,
    });
    if (error) toast.error(error.message);
  }

  return (
    <PageShell>
      <section className="max-w-6xl mx-auto px-6 md:px-8 py-8">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-8">
          <span className="text-gradient">Messages</span>
        </h1>

        {matches.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center">
            <div className="text-4xl mb-3">💬</div>
            <h2 className="text-xl font-bold">Aucun match pour le moment</h2>
            <p className="text-muted-foreground mt-2">Likez des véhicules — quand le propriétaire vous like en retour, une conversation s'ouvre ici.</p>
            <Link to="/matches" className="inline-block mt-6 bg-primary px-6 py-3 rounded-full font-semibold glow">Découvrir des matches</Link>
          </div>
        ) : (
        <div className="grid md:grid-cols-[280px_1fr] gap-6 glass rounded-3xl overflow-hidden min-h-[600px]">
          <aside className="border-r border-white/10 p-3 space-y-2">
            {matches.map((m) => (
              <button
                key={m.id}
                onClick={() => setActiveId(m.id)}
                className={`w-full flex gap-3 p-3 rounded-2xl text-left transition ${activeId === m.id ? "bg-primary/10" : "hover:bg-white/5"}`}
              >
                {m.otherVehicle.photos?.[0] ? (
                  <img src={m.otherVehicle.photos[0]} alt={m.otherVehicle.brand} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-secondary flex-shrink-0 flex items-center justify-center">🚗</div>
                )}
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{m.other.display_name}</div>
                  <div className="text-xs text-muted-foreground truncate">{m.otherVehicle.brand} {m.otherVehicle.model}</div>
                </div>
              </button>
            ))}
          </aside>

          <div className="flex flex-col">
            {active && (
              <div className="p-4 border-b border-white/10 flex items-center gap-3">
                {active.otherVehicle.photos?.[0] && (
                  <img src={active.otherVehicle.photos[0]} alt={active.otherVehicle.brand} className="w-10 h-10 rounded-xl object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{active.other.display_name}</div>
                  <div className="text-xs text-muted-foreground truncate">{active.otherVehicle.brand} {active.otherVehicle.model}{active.otherVehicle.city ? ` • ${active.otherVehicle.city}` : ""}</div>
                </div>
                <Link to="/vehicle/$id" params={{ id: active.otherVehicle.id }} className="text-xs glass px-3 py-1.5 rounded-full hover:bg-white/10">Voir le véhicule</Link>
              </div>
            )}

            <div ref={scrollRef} className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[500px]">
              {messages.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">Aucun message — lancez la conversation.</div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender_id === user!.id ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm ${
                    m.sender_id === user!.id ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary rounded-bl-sm"
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-white/10 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Votre message..."
                className="input flex-1"
                disabled={!active}
              />
              <button onClick={send} disabled={!active || !input.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 rounded-xl font-semibold glow disabled:opacity-40">
                Envoyer
              </button>
            </div>
          </div>
        </div>
        )}
      </section>
    </PageShell>
  );
}