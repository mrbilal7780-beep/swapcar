import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { MoreHorizontal } from "lucide-react";
import { useRef, useEffect, useCallback, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { PostCard, type FeedPost } from "@/components/social/PostCard";

export const Route = createFileRoute("/feed")({
  head: () => ({ meta: [{ title: "Feed — TORQUE" }] }),
  component: () => <RequireAuth><FeedPage /></RequireAuth>,
});

interface RawPost {
  id: string;
  author_id: string;
  content: string | null;
  media_urls: string[];
  media_type: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  created_at: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

type FeedMode = "following" | "foryou";

function toFeedPost(p: RawPost): FeedPost {
  return {
    ...p,
    author: {
      user_id: p.author_id,
      display_name: p.display_name,
      username: p.username,
      avatar_url: p.avatar_url,
    },
  };
}

function FeedPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<FeedMode>("foryou");
  const observerTarget = useRef<HTMLDivElement>(null);

  // Posts "For You" — triés par score (algorithme)
  const forYouQuery = useInfiniteQuery({
    queryKey: ["feed-foryou"],
    enabled: mode === "foryou",
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from("feed_ranked")
        .select("*")
        .range(pageParam, pageParam + 9);
      if (error) throw error;
      return (data ?? []) as RawPost[];
    },
    getNextPageParam: (last, all) => last.length === 10 ? all.length * 10 : undefined,
    initialPageParam: 0,
  });

  // Posts "Following" — chronologique, seulement les gens suivis
  const followingQuery = useInfiniteQuery({
    queryKey: ["feed-following", user?.id],
    enabled: mode === "following" && !!user,
    queryFn: async ({ pageParam = 0 }) => {
      // Récupérer les IDs suivis
      const { data: followings } = await supabase
        .from("followings")
        .select("following_id")
        .eq("follower_id", user!.id);

      const ids = followings?.map(f => f.following_id) ?? [];
      if (ids.length === 0) return [] as RawPost[];

      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles!posts_author_id_fkey (
            user_id, display_name, username, avatar_url
          )
        `)
        .in("author_id", ids)
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + 9);

      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        ...p,
        display_name: p.profiles?.display_name,
        username: p.profiles?.username,
        avatar_url: p.profiles?.avatar_url,
      })) as RawPost[];
    },
    getNextPageParam: (last, all) => last.length === 10 ? all.length * 10 : undefined,
    initialPageParam: 0,
  });

  const activeQuery = mode === "foryou" ? forYouQuery : followingQuery;
  const posts = activeQuery.data?.pages.flatMap(p => p) ?? [];

  // Incrémenter les vues — déclenché quand le post entre réellement dans le viewport
  // (fonctionne aussi bien au scroll tactile qu'à la souris, contrairement à onMouseEnter)
  const viewedRef = useRef<Set<string>>(new Set());
  const recordView = useCallback(async (postId: string) => {
    if (!user || viewedRef.current.has(postId)) return;
    viewedRef.current.add(postId);
    await supabase.rpc("increment_post_view", {
      post_uuid: postId,
      viewer_uuid: user.id,
    });
  }, [user]);

  const viewObserver = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    viewObserver.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const postId = entry.target.getAttribute("data-post-id");
            if (postId) recordView(postId);
          }
        });
      },
      { threshold: 0.5 }
    );
    return () => viewObserver.current?.disconnect();
  }, [recordView]);

  const observePost = useCallback((el: HTMLElement | null) => {
    if (el && viewObserver.current) viewObserver.current.observe(el);
  }, []);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && activeQuery.hasNextPage && !activeQuery.isFetchingNextPage) {
          activeQuery.fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [activeQuery]);

  if (activeQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header avec tabs For You / Following */}
      <div className="sticky top-0 z-40 border-b border-white/5 bg-background/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-0 flex items-center justify-between">
          <h1 className="text-xl font-black">TORQUE</h1>
          <button className="p-2 hover:bg-white/5 rounded-full transition">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
        <div className="max-w-2xl mx-auto flex border-b border-white/5">
          <FeedTab active={mode === "foryou"} onClick={() => setMode("foryou")} label="Pour toi" />
          <FeedTab active={mode === "following"} onClick={() => setMode("following")} label="Abonnements" />
        </div>
      </div>

      {/* Posts */}
      <div className="max-w-2xl mx-auto">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-8 text-center gap-3">
            <p className="text-xl font-bold">
              {mode === "following" ? "Suis des membres pour voir leurs posts" : "Aucune publication"}
            </p>
            <Link
              to="/explore"
              className="mt-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold text-sm"
            >
              Explorer la communauté
            </Link>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <div key={post.id} ref={observePost} data-post-id={post.id}>
                <PostCard post={toFeedPost(post)} />
              </div>
            ))}

            {activeQuery.hasNextPage && (
              <div ref={observerTarget} className="py-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function FeedTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 text-sm font-semibold border-b-2 transition ${
        active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
