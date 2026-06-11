import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/Header";
import { PostCard, type FeedPost } from "@/components/social/PostCard";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — Carswap AI` },
      { name: "description", content: `Découvre le profil de @${params.username} sur Carswap AI.` },
      { property: "og:title", content: `@${params.username} — Carswap AI` },
    ],
  }),
  component: PublicProfile,
});

function PublicProfile() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-by-username", username],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .or(`username.eq.${username},user_id.eq.${username}`)
        .maybeSingle();
      return data;
    },
  });

  const profileUserId = profile?.user_id;

  const { data: posts = [] } = useQuery<FeedPost[]>({
    queryKey: ["user-posts", profileUserId],
    enabled: !!profileUserId,
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("author_id", profileUserId!)
        .order("created_at", { ascending: false });
      return (data ?? []).map((p) => ({ ...p, author: profile ?? null }));
    },
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["user-vehicles", profileUserId],
    enabled: !!profileUserId,
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("*")
        .eq("owner_id", profileUserId!)
        .eq("status", "published");
      return data ?? [];
    },
  });

  const { data: isFollowing } = useQuery({
    queryKey: ["is-following", profileUserId, user?.id],
    enabled: !!profileUserId && !!user && profileUserId !== user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user!.id)
        .eq("following_id", profileUserId!)
        .maybeSingle();
      return !!data;
    },
  });

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (!user || !profileUserId) return;
      if (isFollowing) {
        await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profileUserId);
      } else {
        await supabase.from("follows").insert({ follower_id: user.id, following_id: profileUserId });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["is-following"] });
      qc.invalidateQueries({ queryKey: ["profile-by-username", username] });
    },
  });

  if (isLoading) {
    return <PageShell><div className="text-center py-32 text-muted-foreground">Chargement…</div></PageShell>;
  }
  if (!profile) {
    return <PageShell><div className="text-center py-32 text-muted-foreground">Profil introuvable.</div></PageShell>;
  }

  const initials = (profile.display_name ?? profile.username ?? "?").slice(0, 2).toUpperCase();
  const isMe = user?.id === profileUserId;

  return (
    <PageShell>
      <section className="max-w-3xl mx-auto px-4 md:px-6 py-8">
        <div className="glass rounded-3xl overflow-hidden">
          <div
            className="h-40 md:h-56 bg-gradient-to-br from-primary/30 to-primary/5"
            style={profile.cover_url ? { backgroundImage: `url(${profile.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
          />
          <div className="p-6 md:p-8 -mt-12 relative">
            <div className="flex items-end gap-4">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-background" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/40 glow flex items-center justify-center text-3xl font-black border-4 border-background">
                  {initials}
                </div>
              )}
              <div className="flex-1 pb-2">
                <h1 className="text-2xl md:text-3xl font-black">{profile.display_name ?? `@${profile.username ?? "user"}`}</h1>
                <p className="text-muted-foreground text-sm">@{profile.username ?? profile.user_id.slice(0, 8)} {profile.city ? `· ${profile.city}` : ""}</p>
              </div>
              {!isMe && user && (
                <button
                  onClick={() => toggleFollow.mutate()}
                  disabled={toggleFollow.isPending}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
                    isFollowing ? "glass text-foreground" : "bg-primary text-primary-foreground glow"
                  }`}
                >
                  {isFollowing ? "Abonné ✓" : "S'abonner"}
                </button>
              )}
            </div>
            {profile.bio && <p className="text-sm text-muted-foreground mt-4">{profile.bio}</p>}
            <div className="flex gap-6 mt-5 text-sm">
              <div><strong>{profile.posts_count ?? 0}</strong> <span className="text-muted-foreground">posts</span></div>
              <div><strong>{profile.followers_count ?? 0}</strong> <span className="text-muted-foreground">abonnés</span></div>
              <div><strong>{profile.following_count ?? 0}</strong> <span className="text-muted-foreground">abonnements</span></div>
              <div className="ml-auto text-xs glass px-3 py-1 rounded-full text-primary">Trust {profile.trust_score ?? 50}</div>
            </div>
          </div>
        </div>

        {vehicles.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Garage</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {vehicles.map((v) => (
                <Link key={v.id} to="/vehicle/$id" params={{ id: v.id }} className="glass rounded-2xl overflow-hidden hover:scale-[1.02] transition">
                  {v.photos?.[0] ? (
                    <img src={v.photos[0]} alt="" className="w-full aspect-square object-cover" />
                  ) : (
                    <div className="w-full aspect-square bg-secondary flex items-center justify-center text-3xl">🚗</div>
                  )}
                  <div className="p-3">
                    <div className="font-semibold text-sm">{v.brand} {v.model}</div>
                    <div className="text-xs text-muted-foreground">{v.year}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Publications</h2>
          {posts.length === 0 ? (
            <div className="glass rounded-3xl p-10 text-center text-muted-foreground text-sm">
              Aucune publication.
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}