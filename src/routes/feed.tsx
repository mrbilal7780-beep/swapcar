import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/Header";
import { PostComposer } from "@/components/social/PostComposer";
import { PostCard, type FeedPost } from "@/components/social/PostCard";
import { useAuth } from "@/lib/auth";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Feed — SwapCars AI" },
      { name: "description", content: "Le feed automobile communautaire. Partage tes builds, suis les meilleurs garages." },
      { property: "og:title", content: "Feed automobile — SwapCars AI" },
      { property: "og:description", content: "Le réseau social des passionnés d'automobile." },
    ],
  }),
  component: Feed,
});

function Feed() {
  const { user } = useAuth();

  const { data: posts = [], isLoading } = useQuery<FeedPost[]>({
    queryKey: ["feed"],
    queryFn: async () => {
      const { data: postsData, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      if (!postsData?.length) return [];
      const authorIds = [...new Set(postsData.map((p) => p.author_id))];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", authorIds);
      const map = new Map(profs?.map((p) => [p.user_id, p]) ?? []);
      return postsData.map((p) => ({ ...p, author: map.get(p.author_id) ?? null }));
    },
  });

  return (
    <PageShell>
      <section className="max-w-2xl mx-auto px-4 md:px-6 py-8">
        <header className="mb-6">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            Le <span className="text-gradient">feed</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            La communauté automobile en temps réel.
          </p>
        </header>

        {user ? (
          <PostComposer />
        ) : (
          <div className="glass rounded-3xl p-6 text-center mb-6">
            <p className="text-muted-foreground text-sm mb-3">Connecte-toi pour publier et interagir.</p>
            <Link to="/login" className="inline-block bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold glow">
              Se connecter
            </Link>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground text-sm">Chargement…</div>
        ) : posts.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center text-muted-foreground">
            Pas encore de publication. Sois le premier !
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}