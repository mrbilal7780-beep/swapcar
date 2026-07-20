import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { MoreHorizontal, Heart, MessageCircle, Share2, Bookmark, Eye } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";

export const Route = createFileRoute("/feed")({
  head: () => ({ meta: [{ title: "Feed — TORQUE" }] }),
  component: () => <RequireAuth><FeedPage /></RequireAuth>,
});

interface Post {
  id: string;
  author_id: string;
  content: string | null;
  media_urls: string[];
  media_type: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  score: number;
  created_at: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

type FeedMode = "following" | "foryou";

function FeedPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [mode, setMode] = useState<FeedMode>("foryou");
  const observerTarget = useRef<HTMLDivElement>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});

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
      return (data ?? []) as Post[];
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
      if (ids.length === 0) return [] as Post[];

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
      })) as Post[];
    },
    getNextPageParam: (last, all) => last.length === 10 ? all.length * 10 : undefined,
    initialPageParam: 0,
  });

  const activeQuery = mode === "foryou" ? forYouQuery : followingQuery;
  const posts = activeQuery.data?.pages.flatMap(p => p) ?? [];

  // Likes de l'utilisateur
  const { data: myLikes = [] } = useQuery({
    queryKey: ["my-likes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("likes").select("post_id").eq("user_id", user!.id);
      return data?.map(l => l.post_id) ?? [];
    },
  });

  const likedSet = new Set(myLikes);

  const likeMutation = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (isLiked) {
        await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", user!.id);
      } else {
        await supabase.from("likes").insert({ post_id: postId, user_id: user!.id });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-likes"] });
      qc.invalidateQueries({ queryKey: ["feed-foryou"] });
      qc.invalidateQueries({ queryKey: ["feed-following"] });
    },
  });

  // Incrémenter les vues automatiquement
  const recordView = async (postId: string) => {
    if (!user) return;
    await supabase.rpc("increment_post_view", {
      post_uuid: postId,
      viewer_uuid: user.id,
    });
  };

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
            {posts.map((post) => {
              const isLiked = likedSet.has(post.id);
              const handle = post.username ?? post.author_id?.slice(0, 8);
              const initials = (post.display_name ?? "?").slice(0, 2).toUpperCase();

              return (
                <article
                  key={post.id}
                  className="border-b border-white/5"
                  onMouseEnter={() => recordView(post.id)}
                >
                  {/* Author */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Link to="/u/$username" params={{ username: handle }}>
                      {post.avatar_url ? (
                        <img src={post.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center font-bold text-sm">
                          {initials}
                        </div>
                      )}
                    </Link>
                    <div className="flex-1">
                      <Link to="/u/$username" params={{ username: handle }}>
                        <p className="font-bold text-sm">{post.display_name ?? handle}</p>
                        <p className="text-xs text-muted-foreground">@{handle} · {timeAgo(post.created_at)}</p>
                      </Link>
                    </div>
                  </div>

                  {/* Caption */}
                  {post.content && (
                    <p className="px-4 pb-3 text-sm leading-relaxed">{post.content}</p>
                  )}

                  {/* Media */}
                  {post.media_urls?.length > 0 && (
                    <div className={`grid gap-[2px] ${post.media_urls.length > 1 ? "grid-cols-2" : ""}`}>
                      {post.media_urls.slice(0, 4).map((url, i) =>
                        post.media_type === "video" ? (
                          <video key={i} src={url} controls playsInline className="w-full aspect-square object-cover bg-black" />
                        ) : (
                          <img key={i} src={url} alt="" className="w-full aspect-square object-cover" loading="lazy" />
                        )
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="px-4 pt-2 flex items-center gap-4">
                    <button
                      onClick={() => likeMutation.mutate({ postId: post.id, isLiked })}
                      className="transition"
                    >
                      <Heart className={`w-6 h-6 transition ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
                    </button>
                    <Link to="/u/$username" params={{ username: handle }}>
                      <MessageCircle className="w-6 h-6" />
                    </Link>
                    <button
                      onClick={async () => {
                        try {
                          if (navigator.share) {
                            await navigator.share({ url: `${window.location.origin}/u/${handle}` });
                          } else {
                            await navigator.clipboard.writeText(`${window.location.origin}/u/${handle}`);
                            toast.success("Lien copié !");
                          }
                        } catch {}
                      }}
                    >
                      <Share2 className="w-6 h-6" />
                    </button>
                    <button
                      className="ml-auto"
                      onClick={() => setSaved(s => ({ ...s, [post.id]: !s[post.id] }))}
                    >
                      <Bookmark className={`w-6 h-6 ${saved[post.id] ? "fill-foreground" : ""}`} />
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="px-4 pt-1 pb-3 space-y-0.5">
                    <p className="text-sm font-bold">{post.likes_count} j'aime</p>
                    {post.content && (
                      <p className="text-sm">
                        <Link to="/u/$username" params={{ username: handle }} className="font-bold mr-1">
                          {handle}
                        </Link>
                        {post.content.slice(0, 120)}{post.content.length > 120 ? "..." : ""}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {post.views_count} vues
                      </span>
                      {post.comments_count > 0 && (
                        <span>{post.comments_count} commentaires</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}

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

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}j`;
}