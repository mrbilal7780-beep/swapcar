import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { useEffect, useRef, useState } from "react";
import { Film } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { ReelCard } from "@/components/social/ReelCard";
import type { FeedPost } from "@/components/social/PostCard";

export const Route = createFileRoute("/feed")({
  head: () => ({ meta: [{ title: "Feed — TORQUE" }] }),
  component: () => <RequireAuth><ReelsFeed /></RequireAuth>,
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
  score?: number;
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

function ReelsFeed() {
  const { user } = useAuth();
  const [mode, setMode] = useState<FeedMode>("foryou");
  const [muted, setMuted] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const bottomRef = useRef<HTMLDivElement>(null);

  // Comptes suivis — utilisés pour faire remonter leurs reels dans "Pour toi"
  const { data: followedIds = [] } = useQuery({
    queryKey: ["followed-ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("followings").select("following_id").eq("follower_id", user!.id);
      return data?.map((f) => f.following_id) ?? [];
    },
  });

  const forYouQuery = useInfiniteQuery({
    queryKey: ["reels", "foryou"],
    enabled: mode === "foryou",
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from("feed_ranked")
        .select("*")
        .eq("media_type", "video")
        .range(pageParam, pageParam + 9);
      if (error) throw error;
      return (data ?? []) as RawPost[];
    },
    getNextPageParam: (last, all) => (last.length === 10 ? all.length * 10 : undefined),
    initialPageParam: 0,
  });

  const followingQuery = useInfiniteQuery({
    queryKey: ["reels", "following", user?.id],
    enabled: mode === "following" && !!user,
    queryFn: async ({ pageParam = 0 }) => {
      const ids = followedIds;
      if (ids.length === 0) return [] as RawPost[];
      const { data, error } = await supabase
        .from("posts")
        .select(`*, profiles!posts_author_id_fkey (user_id, display_name, username, avatar_url)`)
        .eq("media_type", "video")
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
    getNextPageParam: (last, all) => (last.length === 10 ? all.length * 10 : undefined),
    initialPageParam: 0,
  });

  const activeQuery = mode === "foryou" ? forYouQuery : followingQuery;
  const rawPosts = activeQuery.data?.pages.flatMap((p) => p) ?? [];

  // Lance la lecture du premier reel dès qu'il est disponible (ou quand on
  // change d'onglet et que le reel actif n'existe plus dans la nouvelle liste),
  // sans attendre le premier callback de l'IntersectionObserver.
  useEffect(() => {
    if (rawPosts.length === 0) return;
    if (!rawPosts.some((p) => p.id === activeId)) setActiveId(rawPosts[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawPosts.map((p) => p.id).join(","), mode]);

  // "Algorithme" v1 : pas de systeme de centres d'interet dans le schema actuel,
  // donc on utilise le score d'engagement (feed_ranked) + le graphe de suivi comme
  // signal de pertinence — les comptes suivis remontent, le reste garde l'ordre par score.
  const posts =
    mode === "foryou" && followedIds.length > 0
      ? [...rawPosts].sort((a, b) => {
          const aFollowed = followedIds.includes(a.author_id) ? 1 : 0;
          const bFollowed = followedIds.includes(b.author_id) ? 1 : 0;
          if (aFollowed !== bFollowed) return bFollowed - aFollowed;
          return (b.score ?? 0) - (a.score ?? 0);
        })
      : rawPosts;

  // Vues — même logique que l'ancien feed : pas de vue sur ses propres posts,
  // dédoublonnées par session.
  const ownPostIds = new Set(posts.filter((p) => p.author_id === user?.id).map((p) => p.id));
  const SESSION_KEY = "torque-viewed-posts";
  const viewedRef = useRef<Set<string>>(new Set(JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "[]")));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const postId = entry.target.getAttribute("data-post-id");
            if (!postId) return;
            setActiveId(postId);
            if (user && !viewedRef.current.has(postId) && !ownPostIds.has(postId)) {
              viewedRef.current.add(postId);
              sessionStorage.setItem(SESSION_KEY, JSON.stringify([...viewedRef.current]));
              supabase.rpc("increment_post_view", { post_uuid: postId, viewer_uuid: user.id });
            }
          }
        });
      },
      { root: container, threshold: [0.6] }
    );
    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [posts.map((p) => p.id).join(","), user]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && activeQuery.hasNextPage && !activeQuery.isFetchingNextPage) {
          activeQuery.fetchNextPage();
        }
      },
      { root: containerRef.current, threshold: 0.1 }
    );
    if (bottomRef.current) observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [activeQuery]);

  if (activeQuery.isLoading) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] bg-black overflow-hidden">
      {/* Tabs en surimpression */}
      <div className="absolute top-0 left-0 right-0 z-20 flex justify-center gap-6 pt-[max(1rem,env(safe-area-inset-top))] pb-3 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
        <button
          onClick={() => setMode("foryou")}
          className={`pointer-events-auto text-sm font-bold drop-shadow transition ${mode === "foryou" ? "text-white" : "text-white/50"}`}
        >
          Pour toi
        </button>
        <button
          onClick={() => setMode("following")}
          className={`pointer-events-auto text-sm font-bold drop-shadow transition ${mode === "following" ? "text-white" : "text-white/50"}`}
        >
          Abonnements
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-8 text-white">
          <Film className="w-12 h-12 text-white/40" />
          <p className="text-lg font-bold">
            {mode === "following" ? "Les comptes que tu suis n'ont pas encore posté de vidéo" : "Aucun reel pour l'instant"}
          </p>
          <p className="text-sm text-white/60">
            Publie une vidéo depuis l'onglet Post pour lancer les reels TORQUE.
          </p>
        </div>
      ) : (
        <div ref={containerRef} className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
          {posts.map((post) => (
            <div
              key={post.id}
              data-post-id={post.id}
              ref={(el) => {
                if (el) sectionRefs.current.set(post.id, el);
                else sectionRefs.current.delete(post.id);
              }}
            >
              <ReelCard
                post={toFeedPost(post)}
                isActive={activeId === post.id}
                muted={muted}
                onToggleMute={() => setMuted((m) => !m)}
              />
            </div>
          ))}
          <div ref={bottomRef} className="h-1" />
        </div>
      )}

      <BottomNav />
    </div>
  );
}
