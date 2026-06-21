import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { PageShell } from "@/components/layout/Header";
import { Search, ArrowLeft, UserPlus, UserCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/search-users")({
  head: () => ({ meta: [{ title: "Rechercher des membres — TORQUE" }] }),
  component: () => <RequireAuth><SearchUsers /></RequireAuth>,
});

function SearchUsers() {
  const { user } = useAuth();
  const userId = user!.id;
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["search-users", query],
    queryFn: async () => {
      if (query.trim().length < 2) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("user_id", userId)
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
    enabled: query.trim().length >= 2,
  });

  const { data: myFollowing = [] } = useQuery({
    queryKey: ["my-following", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);
      if (error) throw error;
      return data?.map((f) => f.following_id) ?? [];
    },
  });

  const followingSet = new Set(myFollowing);

  const follow = useMutation({
    mutationFn: async (targetId: string) => {
      const { error } = await supabase.from("follows").insert({
        follower_id: userId,
        following_id: targetId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-following", userId] });
    },
    onError: () => toast.error("Impossible de s'abonner"),
  });

  const unfollow = useMutation({
    mutationFn: async (targetId: string) => {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", userId)
        .eq("following_id", targetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-following", userId] });
    },
    onError: () => toast.error("Impossible de se désabonner"),
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
            placeholder="Nom d'utilisateur ou nom affiché..."
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
        </div>

        {query.trim().length < 2 && (
          <p className="text-sm text-muted-foreground text-center py-12">
            Tapez au moins 2 caractères pour rechercher
          </p>
        )}

        {query.trim().length >= 2 && isLoading && (
          <p className="text-sm text-muted-foreground text-center py-12">Recherche...</p>
        )}

        {query.trim().length >= 2 && !isLoading && results.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">Aucun résultat</p>
        )}

        <div className="space-y-1">
          {results.map((p) => {
            const isFollowing = followingSet.has(p.user_id);
            return (
              <div key={p.user_id} className="flex items-center gap-3 px-1 py-2.5">
                <Link to="/u/$username" params={{ username: p.username ?? p.user_id }} className="flex items-center gap-3 flex-1 min-w-0">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {(p.display_name ?? p.username ?? "?").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{p.username ?? p.display_name}</p>
                    {p.display_name && p.username && (
                      <p className="text-xs text-muted-foreground truncate">{p.display_name}</p>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() =>
                    isFollowing ? unfollow.mutate(p.user_id) : follow.mutate(p.user_id)
                  }
                  disabled={follow.isPending || unfollow.isPending}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition flex-shrink-0 ${
                    isFollowing
                      ? "bg-white/5 border border-white/10 text-foreground hover:bg-white/10"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      Abonné
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      Suivre
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}