import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import type { FeedPost } from "@/components/social/PostCard";
import { CommentsSheet } from "@/components/social/CommentsSheet";

export function ReelCard({
  post,
  isActive,
  muted,
  onToggleMute,
}: {
  post: FeedPost;
  isActive: boolean;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showComments, setShowComments] = useState(false);

  const [likePopKey, setLikePopKey] = useState(0);
  const isOwner = user?.id === post.author_id;
  const initials = (post.author?.display_name ?? post.author?.username ?? "?").slice(0, 2).toUpperCase();
  const handle = post.author?.username ?? post.author_id.slice(0, 8);
  const profileParam = post.author?.username ?? post.author_id;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isActive]);

  const invalidatePosts = () => {
    qc.invalidateQueries({ queryKey: ["reels"] });
  };

  const { data: liked } = useQuery({
    queryKey: ["post-liked", post.id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", post.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  const likedKey = ["post-liked", post.id, user?.id];
  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Connexion requise");
      if (liked) {
        await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      } else {
        await supabase.from("likes").insert({ post_id: post.id, user_id: user.id });
      }
      const { count } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", post.id);
      await supabase.from("posts").update({ likes_count: count ?? 0 }).eq("id", post.id);
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: likedKey });
      const previous = qc.getQueryData(likedKey);
      if (!liked) setLikePopKey((k) => k + 1);
      qc.setQueryData(likedKey, !liked);
      return { previous };
    },
    onError: (_e, _vars, context) => qc.setQueryData(likedKey, context?.previous),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: likedKey });
      invalidatePosts();
    },
  });

  const { data: following } = useQuery({
    queryKey: ["is-following", post.author_id, user?.id],
    enabled: !!user && !isOwner,
    queryFn: async () => {
      const { data } = await supabase
        .from("followings")
        .select("id")
        .eq("follower_id", user!.id)
        .eq("following_id", post.author_id)
        .maybeSingle();
      return !!data;
    },
  });

  const followKey = ["is-following", post.author_id, user?.id];
  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Connexion requise");
      if (following) {
        await supabase.from("followings").delete().eq("follower_id", user.id).eq("following_id", post.author_id);
      } else {
        await supabase.from("followings").insert({ follower_id: user.id, following_id: post.author_id });
      }
    },
    // Bascule l'état affiché immédiatement — pas d'attente réseau, essentiel dans un flux
    // vertical rapide comme les reels. On revient en arrière seulement en cas d'erreur.
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: followKey });
      const previous = qc.getQueryData(followKey);
      qc.setQueryData(followKey, !following);
      return { previous };
    },
    onError: (e: any, _vars, context) => {
      qc.setQueryData(followKey, context?.previous);
      toast.error(e.message ?? "Erreur");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: followKey }),
  });

  const [burst, setBurst] = useState(false);
  const handleDoubleTap = () => {
    if (!liked) toggleLike.mutate();
    setBurst(true);
    setTimeout(() => setBurst(false), 700);
  };

  return (
    <section className="relative h-[100dvh] w-full snap-start snap-always bg-black overflow-hidden">
      <video
        ref={videoRef}
        src={post.media_urls?.[0]}
        loop
        muted={muted}
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        onClick={onToggleMute}
        onDoubleClick={handleDoubleTap}
      />

      {/* Coeur qui apparait au double-tap */}
      {burst && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <Heart className="w-28 h-28 fill-red-500 text-red-500 drop-shadow-2xl torque-pop" />
        </div>
      )}

      {/* Voile pour la lisibilité du texte */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

      {/* Bouton son */}
      <button
        onClick={onToggleMute}
        className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      {/* Colonne d'actions */}
      <div className="absolute right-3 bottom-28 z-10 flex flex-col items-center gap-5">
        <Link to="/u/$username" params={{ username: profileParam }} className="relative">
          {post.author?.avatar_url ? (
            <img src={post.author.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-white/80" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center font-bold text-sm border-2 border-white/80">
              {initials}
            </div>
          )}
          {!isOwner && user && (
            <button
              onClick={(e) => { e.preventDefault(); toggleFollow.mutate(); }}
              className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center ${
                following ? "bg-white/20 text-white" : "bg-primary text-primary-foreground"
              }`}
            >
              {following ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            </button>
          )}
        </Link>

        <button onClick={() => toggleLike.mutate()} disabled={!user} className="flex flex-col items-center gap-1">
          <Heart
            key={likePopKey}
            className={`w-8 h-8 drop-shadow ${liked ? "fill-red-500 text-red-500 torque-pop" : "text-white"}`}
          />
          <span className="text-xs font-semibold text-white drop-shadow">{post.likes_count}</span>
        </button>

        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
          <MessageCircle className="w-8 h-8 text-white drop-shadow" />
          <span className="text-xs font-semibold text-white drop-shadow">{post.comments_count}</span>
        </button>

        <button
          onClick={async () => {
            const url = `${window.location.origin}/u/${profileParam}`;
            try {
              if (navigator.share) await navigator.share({ title: "TORQUE", text: post.content ?? "", url });
              else { await navigator.clipboard.writeText(url); toast.success("Lien copié !"); }
            } catch {}
          }}
          className="flex flex-col items-center gap-1"
        >
          <Share2 className="w-7 h-7 text-white drop-shadow" />
        </button>
      </div>

      {/* Auteur + légende */}
      <div className="absolute left-4 right-20 bottom-24 z-10 text-white">
        <Link to="/u/$username" params={{ username: profileParam }} className="font-bold text-sm drop-shadow">
          @{handle}
        </Link>
        {post.content && (
          <p className="text-sm mt-1 leading-snug drop-shadow line-clamp-3">{post.content}</p>
        )}
      </div>

      {showComments && (
        <CommentsSheet postId={post.id} onClose={() => setShowComments(false)} onSent={invalidatePosts} />
      )}
    </section>
  );
}
