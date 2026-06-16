import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/lib/auth";
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";

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
  content: string | null; // Correction : autoriser null car la base de données peut renvoyer null
  image_url?: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  liked?: boolean;
  saved?: boolean;
  user?: {
    display_name: string;
    avatar_url?: string;
  };
}

function FeedPage() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: async ({ pageParam = 0 }) => {
      const { data: posts } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + 9);
      return (posts as Post[]) ?? []; // Cast explicite pour correspondre à l'interface
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 10 ? allPages.length * 10 : undefined;
    },
    initialPageParam: 0,
  });

  const observerTarget = useRef<HTMLDivElement>(null);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const posts = data?.pages.flatMap((page) => page) ?? [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <style>{`html { padding-top: max(0px, env(safe-area-inset-top)); padding-bottom: max(0px, env(safe-area-inset-bottom)); padding-left: max(0px, env(safe-area-inset-left)); padding-right: max(0px, env(safe-area-inset-right)); }`}</style>

      <div className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-black">TORQUE Feed</h1>
          <button className="p-2 hover:bg-white/5 rounded-lg transition">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto divide-y divide-white/5">
        {posts.length === 0 ? (
          <div className="h-96 flex items-center justify-center text-center px-4">
            <div>
              <div className="text-4xl mb-3">No posts</div>
              <p className="text-muted-foreground mb-4">Follow accounts to get started</p>
              <Link
                to="/explore"
                className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-full font-semibold text-sm hover:bg-primary/90 transition"
              >
                Explore
              </Link>
            </div>
          </div>
        ) : (
          <>
            {posts.map((post: Post) => (
              <PostCard
                key={post.id}
                post={post}
                liked={liked[post.id]}
                saved={saved[post.id]}
                onLike={() => setLiked({ ...liked, [post.id]: !liked[post.id] })}
                onSave={() => setSaved({ ...saved, [post.id]: !saved[post.id] })}
              />
            ))}
            {hasNextPage && (
              <div ref={observerTarget} className="py-8 text-center">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

interface PostCardProps {
  post: Post;
  liked: boolean;
  saved: boolean;
  onLike: () => void;
  onSave: () => void;
}

function PostCard({ post, liked, saved, onLike, onSave }: PostCardProps) {
  return (
    <article className="bg-background hover:bg-white/2.5 transition">
      <div className="p-4 flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-bold text-sm line-clamp-1">{post.user?.display_name || "Anonymous"}</p>
            <p className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <button className="p-2 hover:bg-white/5 rounded-lg transition flex-shrink-0">
          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="px-4">
        {/* Correction : Affichage sécurisé du contenu (même s'il est null) */}
        <p className="text-sm leading-relaxed text-foreground mb-3">{post.content ?? ""}</p>
        {post.image_url && (
          <img
            src={post.image_url}
            alt="Post"
            className="w-full rounded-2xl bg-white/5 mb-4 aspect-square object-cover"
          />
        )}
      </div>

      <div className="px-4 py-2 flex text-xs text-muted-foreground gap-4 border-t border-white/5">
        <span>{post.likes_count} likes</span>
        <span>{post.comments_count} comments</span>
      </div>

      <div className="p-3 flex items-center justify-around border-t border-white/5">
        <ActionButton icon={Heart} label="Like" active={liked} onClick={onLike} />
        <ActionButton icon={MessageCircle} label="Comment" />
        <ActionButton icon={Share2} label="Share" />
        <ActionButton icon={Bookmark} label="Save" active={saved} onClick={onSave} />
      </div>
    </article>
  );
}

function ActionButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition text-xs font-semibold ${
        active
          ? "text-primary bg-primary/10"
          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
