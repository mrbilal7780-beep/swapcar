import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/Header";
import { PostComposer } from "@/components/social/PostComposer";
import { PostCard, type FeedPost } from "@/components/social/PostCard";
import { useAuth } from "@/lib/auth";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Feed — Carswap AI" },
      { name: "description", content: "Le feed automobile communautaire. Partage tes builds, suis les meilleurs garages." },
      { property: "og:title", content: "Feed automobile — Carswap AI" },
      { property: "og:description", content: "Le réseau social des passionnés d'automobile." },
    ],
  }),
  component: Feed,
});

function Feed() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"recent" | "week" | "month" | "top">("recent");

  const { data: posts = [], isLoading } = useQuery<FeedPost[]>({
    queryKey: ["feed", filter],
    queryFn: async () => {
      let q = supabase.from("posts").select("*").limit(50);
      if (filter === "week" || filter === "month") {
        const days = filter === "week" ? 7 : 30;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        q = q.gte("created_at", since).order("created_at", { ascending: false });
      } else if (filter === "top") {
        q = q.order("likes_count", { ascending: false }).order("created_at", { ascending: false });
      } else {
        q = q.order("created_at", { ascending: false });
      }
      const { data: postsData, error } = await q;
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

  const filters = [
    { id: "recent", label: "Récent" },
    { id: "week", label: "7 jours" },
    { id: "month", label: "30 jours" },
    { id: "top", label: "🔥 Top" },
  ] as const;

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

        <div className="flex gap-2 mb-5 overflow-x-auto -mx-2 px-2 pb-1">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                filter === f.id
                  ? "bg-primary text-primary-foreground glow"
                  : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

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