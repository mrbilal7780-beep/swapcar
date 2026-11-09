import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarX, Heart, MapPin, MessageCircle, Settings, UserPlus, Users, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { enablePush, getPushState, type PushState } from "@/lib/push";
import { NearbyCard } from "@/components/events/NearbyCard";

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  if (s < 604800) return `${Math.floor(s / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-BE", { day: "numeric", month: "short" });
}

const SYSTEM_TYPES = new Set(["event_nearby", "event_cancelled", "event_chat"]);

function TypeIcon({ type }: { type: string }) {
  const cls = "w-3 h-3";
  switch (type) {
    case "like": return <Heart className={cls} fill="currentColor" />;
    case "comment": return <MessageCircle className={cls} />;
    case "follow": return <UserPlus className={cls} />;
    case "message": return <Send className={cls} />;
    case "event_cancelled": return <CalendarX className={cls} />;
    case "event_join": return <Users className={cls} />;
    default: return <MapPin className={cls} />;
  }
}

function typeColor(type: string) {
  switch (type) {
    case "like": return "bg-red-500";
    case "event_cancelled": return "bg-red-500";
    case "follow": return "bg-purple-500";
    default: return "bg-primary";
  }
}

// Cloche + centre de notifications. `floating` : bouton posé en haut à gauche (écran des reels).
export function NotificationsBell({ floating = false }: { floating?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [push, setPush] = useState<PushState>("unsupported");
  const [enabling, setEnabling] = useState(false);
  const queryKey = ["app-notifications", user?.id];

  const { data: items = [] } = useQuery({
    queryKey,
    enabled: !!user,
    refetchInterval: 45000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      const ids = [...new Set((data ?? []).map((n: any) => n.actor_id).filter(Boolean))];
      let map = new Map<string, any>();
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name, username, avatar_url")
          .in("user_id", ids as string[]);
        map = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      }
      return (data ?? []).map((n: any) => ({ ...n, actor: n.actor_id ? map.get(n.actor_id) ?? null : null }));
    },
  });

  // Nouvelles notifications en direct
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["app-notifications", user.id] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  useEffect(() => {
    if (open) getPushState().then(setPush);
  }, [open]);

  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("app_notifications")
        .update({ read: true })
        .eq("user_id", user!.id)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const markOne = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("app_notifications").update({ read: true }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  if (!user) return null;

  const unread = items.filter((n: any) => !n.read).length;

  const go = (url?: string | null) => {
    if (!url) return;
    try {
      const u = new URL(url, window.location.origin);
      navigate({ to: u.pathname as any, search: Object.fromEntries(u.searchParams.entries()) as any });
    } catch {
      /* lien invalide : on ignore */
    }
  };

  const onEnablePush = async () => {
    setEnabling(true);
    try {
      await enablePush();
      toast.success("Notifications activées");
    } catch (e: any) {
      toast.error(e?.message ?? "Activation impossible");
    } finally {
      setEnabling(false);
      setPush(await getPushState());
    }
  };

  const button = (
    <button
      onClick={() => setOpen((o) => !o)}
      aria-label="Notifications"
      className={`relative w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 ${
        floating ? "bg-black/40 backdrop-blur-sm" : "bg-white/5 hover:bg-white/10"
      }`}
    >
      <Bell className="w-5 h-5" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-3 right-3 sm:left-auto sm:right-4 sm:w-[380px] top-[max(3.75rem,calc(env(safe-area-inset-top)+3.25rem))] max-h-[72dvh] flex flex-col rounded-3xl bg-[#0f1218] border border-white/10 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
                <h2 className="font-bold text-sm">Notifications</h2>
                <div className="flex items-center gap-1">
                  {unread > 0 && (
                    <button
                      onClick={() => markAll.mutate()}
                      className="text-xs font-semibold text-primary px-2 py-1 rounded-full hover:bg-white/5"
                    >
                      Tout marquer comme lu
                    </button>
                  )}
                  <button
                    onClick={() => { setOpen(false); navigate({ to: "/settings" } as any); }}
                    aria-label="Réglages des notifications"
                    className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="px-3 pt-3 flex-shrink-0 empty:hidden">
                <NearbyCard compact />
              </div>

              {push === "disabled" && (
                <div className="mx-3 mt-3 p-3 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-3 flex-shrink-0">
                  <p className="flex-1 text-xs leading-snug">Active les alertes pour être prévenu des messages et des rassos près de toi.</p>
                  <button
                    onClick={onEnablePush}
                    disabled={enabling}
                    className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                  >
                    {enabling ? "..." : "Activer"}
                  </button>
                </div>
              )}
              {push === "denied" && (
                <p className="mx-3 mt-3 p-3 rounded-2xl bg-white/5 text-xs text-muted-foreground flex-shrink-0">
                  Les notifications sont bloquées dans ton navigateur. Autorise-les dans les réglages du site pour recevoir les alertes.
                </p>
              )}
              {push === "unsupported" && (
                <p className="mx-3 mt-3 p-3 rounded-2xl bg-white/5 text-xs text-muted-foreground flex-shrink-0">
                  Pour recevoir des alertes sur iPhone, ajoute d'abord TORQUE à l'écran d'accueil (Partager puis « Sur l'écran d'accueil »).
                </p>
              )}

              <div className="flex-1 min-h-0 overflow-y-auto py-2">
                {items.length === 0 ? (
                  <div className="text-center py-14 px-6">
                    <Bell className="w-9 h-9 mx-auto text-muted-foreground mb-3" />
                    <p className="font-semibold text-sm">Rien pour l'instant</p>
                    <p className="text-xs text-muted-foreground mt-1">Les j'aime, commentaires, messages et rassos apparaîtront ici.</p>
                  </div>
                ) : (
                  items.map((n: any) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        if (!n.read) markOne.mutate(n.id);
                        setOpen(false);
                        go(n.url);
                      }}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition hover:bg-white/5 ${n.read ? "" : "bg-primary/5"}`}
                    >
                      <div className="relative flex-shrink-0">
                        {SYSTEM_TYPES.has(n.type) || !n.actor?.avatar_url ? (
                          SYSTEM_TYPES.has(n.type) ? (
                            <img src="/torque-icon-192.png" alt="" className="w-11 h-11 rounded-full object-contain bg-white/5 p-1" />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center font-bold text-sm">
                              {(n.actor?.display_name ?? n.title ?? "?").slice(0, 2).toUpperCase()}
                            </div>
                          )
                        ) : (
                          <img src={n.actor.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" />
                        )}
                        <span className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full ${typeColor(n.type)} text-white flex items-center justify-center border-2 border-[#0f1218]`}>
                          <TypeIcon type={n.type} />
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug">
                          <span className="font-semibold">{n.title}</span>{" "}
                          <span className="text-muted-foreground break-words">
                            {n.type === "message" && n.count > 1 ? `${n.count} nouveaux messages` : n.body}
                          </span>
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {timeAgo(n.created_at)}
                          {n.type !== "message" && n.count > 1 ? ` · ${n.count} fois` : ""}
                        </p>
                      </div>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {floating ? (
        <div className="fixed left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40">{button}</div>
      ) : (
        button
      )}
      {panel}
    </>
  );
}
