import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type PostAuthor = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export type FeedPost = {
  id: string;
  author_id: string;
  content: string | null;
  media_urls: string[];
  media_type: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author?: PostAuthor | null;
};

export function PostCard({ post }: { post: FeedPost }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  const { data: liked } = useQuery({
    queryKey: ["post-liked", post.id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", post.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Connexion requise");
      if (liked) {
        await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      } else {
        await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post-liked", post.id] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const initials = (post.author?.display_name ?? post.author?.username ?? "?").slice(0, 2).toUpperCase();
  const handle = post.author?.username ?? post.author_id.slice(0, 8);

  return (
    <article className="glass rounded-3xl overflow-hidden">
      <header className="flex items-center gap-3 p-4">
        <Link to="/u/$username" params={{ username: handle }} className="flex items-center gap-3 flex-1 group">
          {post.author?.avatar_url ? (
            <img src={post.author.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary/40 glow flex items-center justify-center font-bold">
              {initials}
            </div>
          )}
          <div>
            <div className="font-semibold group-hover:text-primary transition">
              {post.author?.display_name ?? handle}
            </div>
            <div className="text-xs text-muted-foreground">@{handle} · {timeAgo(post.created_at)}</div>
          </div>
        </Link>
      </header>

      {post.content && <p className="px-5 pb-3 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>}

      {post.media_urls.length > 0 && (
        <div className={`grid gap-1 ${post.media_urls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {post.media_urls.slice(0, 4).map((url, i) => (
            post.media_type === "video" ? (
              <video key={i} src={url} controls className="w-full aspect-square object-cover bg-black" />
            ) : (
              <img key={i} src={url} alt="" className="w-full aspect-square object-cover" />
            )
          ))}
        </div>
      )}

      <div className="flex items-center gap-1 px-3 py-3 border-t border-white/5">
        <button
          onClick={() => toggleLike.mutate()}
          disabled={!user || toggleLike.isPending}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
            liked ? "text-primary" : "hover:bg-white/5 text-muted-foreground"
          }`}
        >
          <span>{liked ? "♥" : "♡"}</span>
          <span>{post.likes_count}</span>
        </button>
        <button
          onClick={() => setShowComments((s) => !s)}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium hover:bg-white/5 text-muted-foreground"
        >
          <span>💬</span>
          <span>{post.comments_count}</span>
        </button>
        <button
          onClick={async () => {
            const url = `${window.location.origin}/u/${handle}`;
            try {
              if (navigator.share) {
                await navigator.share({ title: "SwapCars AI", text: post.content ?? "Regarde ce post", url });
              } else {
                await navigator.clipboard.writeText(url);
              }
            } catch {}
          }}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium hover:bg-white/5 text-muted-foreground"
          aria-label="Partager"
        >
          <span>↗</span>
          <span className="hidden sm:inline">Partager</span>
        </button>
      </div>

      {showComments && (
        <Comments
          postId={post.id}
          onSent={() => {
            qc.invalidateQueries({ queryKey: ["feed"] });
          }}
          commentText={commentText}
          setCommentText={setCommentText}
        />
      )}
    </article>
  );
}

function Comments({
  postId,
  onSent,
  commentText,
  setCommentText,
}: {
  postId: string;
  onSent: () => void;
  commentText: string;
  setCommentText: (s: string) => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const { data } = await supabase
        .from("post_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (!data?.length) return [];
      const ids = [...new Set(data.map((c) => c.author_id))];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", ids);
      const map = new Map(profs?.map((p) => [p.user_id, p]) ?? []);
      return data.map((c) => ({ ...c, author: map.get(c.author_id) ?? null }));
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!user || !commentText.trim()) return;
      await supabase.from("post_comments").insert({
        post_id: postId,
        author_id: user.id,
        content: commentText.trim(),
      });
    },
    onSuccess: () => {
      setCommentText("");
      qc.invalidateQueries({ queryKey: ["comments", postId] });
      onSent();
    },
  });

  return (
    <div className="border-t border-white/5 p-4 space-y-3 bg-black/20">
      {comments.map((c: any) => (
        <div key={c.id} className="flex gap-3 text-sm">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center text-xs font-bold shrink-0">
            {(c.author?.display_name ?? "?").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-xs">{c.author?.display_name ?? "Utilisateur"}</div>
            <div className="text-sm">{c.content}</div>
          </div>
        </div>
      ))}
      {user && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send.mutate();
          }}
          className="flex gap-2 pt-2"
        >
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Ajouter un commentaire…"
            className="input flex-1"
          />
          <button
            type="submit"
            disabled={!commentText.trim() || send.isPending}
            className="bg-primary text-primary-foreground px-4 rounded-full font-semibold disabled:opacity-50 text-sm"
          >
            Envoyer
          </button>
        </form>
      )}
    </div>
  );
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}j`;
}