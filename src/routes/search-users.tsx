import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { PageShell } from "@/components/layout/Header";
import { Search, ArrowLeft, UserPlus, UserCheck, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/search-users")({
  head: () => ({ meta: [{ title: "Rechercher — TORQUE" }] }),
  component: () => <RequireAuth><SearchUsers /></RequireAuth>,
});

function SearchUsers() {
  const { user } = useAuth();
  const userId = user!.id;
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");

  const term = query.trim().replace(/[,()%*]/g, " ").trim();
  const isSearching = term.length >= 2;

  // Sans recherche : on affiche tous les membres (les plus récents d'abord).
  // Avec recherche (2 lettres ou plus) : on filtre par pseudo ou nom.
  const { data: results = [], isLoading } = useQuery({
    queryKey: ["search-users", isSearching ? term : "all"],
    queryFn: async () => {
      let q = supabase.from("profiles").select("*").neq("user_id", userId);
      if (isSearching) {
        q = q.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`);
      }
      const { data } = await q.order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  const { data: myFollowing = [] } = useQuery({
    queryKey: ["my-following", userId],
    queryFn: async () => {
      const { data } = await supabase.from("followings").select("following_id").eq("follower_id", userId);
      return data?.map(f => f.following_id) ?? [];
    },
  });

  const followingSet = new Set(myFollowing);

  const follow = useMutation({
    mutationFn: async (targetId: string) => {
      await supabase.from("followings").insert({ follower_id: userId, following_id: targetId });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["my-following", userId] }); toast.success("Abonné !"); },
    onError: () => toast.error("Erreur"),
  });

  const unfollow = useMutation({
    mutationFn: async (targetId: string) => {
      await supabase.from("followings").delete().eq("follower_id", userId).eq("following_id", targetId);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["my-following", userId] }); toast.success("Désabonné"); },
    onError: () => toast.error("Erreur"),
  });

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center gap-3 py-3">
          <Link to="/explore" className="p-2 -ml-2 hover:bg-white/5 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold">Rechercher des membres</h1>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un membre..."
            className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
        </div>

        {!isLoading && (
          <p className="text-xs text-muted-foreground mb-2">
            {isSearching ? `${results.length} résultat${results.length > 1 ? "s" : ""}` : `${results.length} membre${results.length > 1 ? "s" : ""} sur TORQUE`}
          </p>
        )}
        {isLoading && <p className="text-sm text-muted-foreground text-center py-12">Chargement...</p>}
        {!isLoading && results.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">Aucun membre trouvé</p>}

        <div className="space-y-1">
          {results.map((p: any) => {
            const isFollowing = followingSet.has(p.user_id);
            return (
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
                      {(p.display_name ?? p.username ?? "?").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{p.username ?? p.display_name}</p>
                    {p.display_name && p.username && <p className="text-xs text-muted-foreground truncate">{p.display_name}</p>}
                  </div>
                </Link>
                <Link
                  to="/chat"
                  search={{ with: p.user_id }}
                  className="p-2 rounded-full hover:bg-white/5 transition flex-shrink-0"
                  aria-label="Envoyer un message"
                >
                  <MessageCircle className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => isFollowing ? unfollow.mutate(p.user_id) : follow.mutate(p.user_id)}
                  disabled={follow.isPending || unfollow.isPending}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition flex-shrink-0 ${isFollowing ? "bg-white/5 border border-white/10" : "bg-primary text-primary-foreground"}`}
                >
                  {isFollowing ? <><UserCheck className="w-3.5 h-3.5" />Abonné</> : <><UserPlus className="w-3.5 h-3.5" />Suivre</>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}