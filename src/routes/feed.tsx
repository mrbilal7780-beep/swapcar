import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/lib/auth";
import { MoreHorizontal } from "lucide-react";
import { useRef, useEffect } from "react";
import { BottomNav } from "@/components/BottomNav";
import { PostCard, type FeedPost } from "@/components/social/PostCard";

export const Route = createFileRoute("/feed")({
  head: () => ({ meta: [{ title: "Feed — TORQUE" }] }),
  component: () => (
    <RequireAuth>
      <FeedPage />
    </RequireAuth>
  ),
});

function FeedPage() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
    useInfiniteQuery({
      queryKey: ["feed"],
      queryFn: async ({ pageParam = 0 }) => {
        const { data: posts, error } = await supabase
          .from("posts")
          .select(`
            *,
            profiles!posts_author_id_fkey (
              user_id,
              display_name,
              avatar_url,
              username
            )
          `)
          .order("created_at", { ascending: false })
          .range(pageParam, pageParam + 9);
        if (error) throw error;
        return (posts ?? []).map((p: any) => ({
          ...p,
          author: p.profiles ?? null,
        })) as FeedPost[];
      },
      getNextPageParam: (lastPage, allPages) =>
        lastPage.length === 10 ? allPages.length * 10 : undefined,
      initialPageParam: 0,
    });

  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
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
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-black tracking-tight">TORQUE</h1>
          <button className="p-2 hover:bg-white/5 rounded-lg transition">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Posts */}
      <div className="max-w-2xl mx-auto">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-8 text-center gap-4">
            <p className="text-2xl font-bold">Aucune publication</p>
            <p className="text-muted-foreground text-sm">
              Suis des membres ou publie quelque chose pour animer le feed
            </p>
            <Link
              to="/explore"
              className="mt-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold text-sm hover:bg-primary/90 transition"
            >
              Explorer la communauté
            </Link>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDeleted={() => refetch()}
              />
            ))}
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