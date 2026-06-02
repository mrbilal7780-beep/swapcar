import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function NotificationsBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifs = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications", user.id] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const unread = notifs.filter((n: any) => !n.read).length;

  const markRead = async () => {
    if (!user || unread === 0) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((o) => !o); if (!open) markRead(); }}
        className="relative w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/10 transition"
      >
        <span>🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-80 glass rounded-2xl overflow-hidden shadow-2xl z-50">
          <div className="p-3 border-b border-white/5 text-sm font-semibold">Notifications</div>
          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">Rien pour l'instant</div>
            ) : notifs.map((n: any) => (
              <div key={n.id} className="p-3 border-b border-white/5 text-sm hover:bg-white/5">
                {renderNotif(n)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function renderNotif(n: any) {
  const labels: Record<string, string> = {
    follow: "vient de s'abonner à toi",
    like: "a aimé ta publication",
    comment: "a commenté ta publication",
    match: "nouveau match",
    message: "nouveau message",
  };
  return <span>Quelqu'un {labels[n.type] ?? n.type}.</span>;
}