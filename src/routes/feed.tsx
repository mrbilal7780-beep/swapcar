import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";

export const Route = createFileRoute("/feed")({
  head: () => ({ meta: [{ title: "Feed — TORQUE" }] }),
  component: () => (
    <RequireAuth>
      <FeedPage />
    </RequireAuth>
  ),
});

interface Post {
  id: string;
  author_id: string;
  content: string;
  media_urls: string[];
  media_type: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles?: {
    display_name: string;
    avatar_url: string;
    username: string;
  };
}

function FeedPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: async ({ pageParam = 0 }) => {
      const { data: posts, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles!posts_author_id_fkey (
            display_name,
            avatar_url,
            username
          )
        `)
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + 9);
      if (error) throw error;
      return posts ?? [];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 10 ? allPages.length * 10 : undefined,
    initialPageParam: 0,
  });

  // Likes de l'utilisateur
  const { data: myLikes = [] } = useQuery({
    queryKey: ["my-likes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", user.id);
      return data?.map(l => l.post_id) ?? [];
    },
    enabled: !!user,
  });

  const likedSet = new Set(myLikes);

  const likeMutation = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (isLiked) {
        await supabase.from("likes").delete()
          .eq("post_id", postId).eq("user_id", user!.id);
      } else {
        await supabase.from("likes").insert({ post_id: postId, user_id: user!.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-likes", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: () => toast.error("Erreur"),
  });

  const observerTarget = useRef<HTMLDivElement>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const posts = data?.pages.flatMap((page) => page) ?? [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-black">TORQUE</h1>
          <button className="p-2 hover:bg-white/5 rounded-lg transition">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto divide-y divide-white/5">
        {posts.length === 0 ? (
          <div className="h-96 flex items-center justify-center text-center px-4">
            <div>
              <p className="text-2xl font-bold mb-2">Aucune publication</p>
              <p className="text-muted-foreground mb-4">Suis des membres pour voir leurs posts</p>
              <Link to="/explore" className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-full font-semibold text-sm">
                Explorer
              </Link>
            </div>
          </div>
        ) : (
          <>
            {posts.map((post: Post) => {
              const isLiked = likedSet.has(post.id);
              const profile = post.profiles;
              return (
                <article key={post.id} className="bg-background">
                  {/* Header */}
                  <div className="p-4 flex items-center gap-3">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {(profile?.display_name ?? "?").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{profile?.display_name ?? profile?.username ?? "Membre TORQUE"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleDateString("fr-FR")}</p>
                    </div>
                  </div>

                  {/* Media */}
                  {post.media_urls?.[0] && (
                    <div className="px-0">
                      {post.media_type === "video" ? (
                        <video src={post.media_urls[0]} controls className="w-full max-h-96 object-cover bg-black" />
                      ) : (
                        <img src={post.media_urls[0]} alt="" className="w-full object-cover" />
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="px-4 pt-2 flex items-center gap-4">
                    <button
                      onClick={() => likeMutation.mutate({ postId: post.id, isLiked })}
                      className="flex items-center gap-1.5 transition"
                    >
                      <Heart className={`w-6 h-6 ${isLiked ? "fill-red-500 text-red-500" : "text-foreground"}`} />
                    </button>
                    <button className="flex items-center gap-1.5">
                      <MessageCircle className="w-6 h-6" />
                    </button>
                    <button className="flex items-center gap-1.5">
                      <Share2 className="w-6 h-6" />
                    </button>
                    <button
                      className="ml-auto"
                      onClick={() => setSaved(s => ({ ...s, [post.id]: !s[post.id] }))}
                    >
                      <Bookmark className={`w-6 h-6 ${saved[post.id] ? "fill-foreground" : ""}`} />
                    </button>
                  </div>

                  {/* Likes count */}
                  <div className="px-4 pt-1 pb-2">
                    <p className="text-sm font-bold">{post.likes_count} j'aime</p>
                    {post.content && (
                      <p className="text-sm mt-1">
                        <span className="font-bold mr-1">{profile?.username ?? profile?.display_name}</span>
                        {post.content}
                      </p>
                    )}
                    {post.comments_count > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Voir les {post.comments_count} commentaires
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
            {hasNextPage && (
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
