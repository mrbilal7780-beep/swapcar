import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { PageShell } from "@/components/layout/Header";
import { Users, Search } from "lucide-react";

export const Route = createFileRoute("/matches")({
  head: () => ({ meta: [{ title: "Communauté — TORQUE" }] }),
  component: () => <RequireAuth><Community /></RequireAuth>,
});

function Community() {
  const { user } = useAuth();

  const { data: suggested = [], isLoading } = useQuery({
    queryKey: ["suggested-users", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Récupérer les gens que je suis déjà
      const { data: following } = await supabase
        .from("followings")
        .select("following_id")
        .eq("follower_id", user!.id);

      const followingIds = following?.map(f => f.following_id) ?? [];
      followingIds.push(user!.id); // exclure moi-même

      // Suggestion : membres les plus actifs (posts récents)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .not("user_id", "in", `(${followingIds.join(",") || user!.id})`)
        .order("posts_count", { ascending: false })
        .limit(20);

      return profiles ?? [];
    },
  });

  const { data: myFollowing = [] } = useQuery({
    queryKey: ["my-following", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("followings")
        .select(`
          following_id,
          profiles!followings_following_id_fkey (
            user_id, display_name, username, avatar_url, posts_count
          )
        `)
        .eq("follower_id", user!.id);
      return data ?? [];
    },
  });

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-4">
        <div className="py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold">Communauté</h1>
          <Link to={"/search-users" as any} className="p-2 hover:bg-white/5 rounded-lg transition">
            <Search className="w-5 h-5" />
          </Link>
        </div>

        {/* Mes abonnements */}
        {myFollowing.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">
              Abonnements ({myFollowing.length})
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {myFollowing.map((f: any) => {
                const p = f.profiles;
                if (!p) return null;
                return (
                  <Link
                    key={f.following_id}
                    to="/u/$username"
                    params={{ username: p.username ?? p.user_id }}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0"
                  >
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center font-bold ring-2 ring-primary/30">
                      {(p.display_name ?? "?").slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs text-muted-foreground truncate w-16 text-center">
                      {p.username ?? p.display_name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Suggestions */}
        <div>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">
            Suggestions
          </h2>

          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {!isLoading && suggested.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Tu suis déjà tout le monde ! Invite des amis à rejoindre TORQUE.
              </p>
            </div>
          )}

          <div className="space-y-1">
            {suggested.map((p: any) => (
              <div key={p.user_id} className="flex items-center gap-3 py-2.5">
                <Link
                  to="/u/$username"
                  params={{ username: p.username ?? p.user_id }}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {(p.display_name ?? "?").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{p.display_name ?? p.username}</p>
                    <p className="text-xs text-muted-foreground">@{p.username} · {p.posts_count ?? 0} posts</p>
                  </div>
                </Link>
                <Link
                  to="/u/$username"
                  params={{ username: p.username ?? p.user_id }}
                  className="text-xs font-semibold text-primary hover:underline flex-shrink-0"
                >
                  Voir →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}