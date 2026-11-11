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
  near = true,
  muted,
  onToggleMute,
}: {
  post: FeedPost;
  isActive: boolean;
  near?: boolean;
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

  // La vidéo n'est téléchargée que si elle est affichée ou juste à côté (évite de charger 10 vidéos d'un coup)
  const load = isActive || near;
  useEffect(() => {
    const video = videoRef.current;
    if (!video || load) return;
    video.pause();
    video.removeAttribute("src");
    video.load();
  }, [load]);

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
    qc.invalidateQueries({ queryKey: ["post-counts", post.id] });
  };

  const likedKey = ["post-liked", post.id, user?.id];
  const countsKey = ["post-counts", post.id];

  // État du j'aime de la personne connectée
  const { data: liked = false } = useQuery({
    queryKey: likedKey,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("likes")
        .select("post_id")
        .eq("post_id", post.id)
        .eq("user_id", user!.id)
        .limit(1);
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
  });

  // Compteurs lus directement dans les tables : toujours exacts, jamais « bloqués »
  const { data: counts } = useQuery({
    queryKey: countsKey,
    initialData: { likes: post.likes_count ?? 0, comments: post.comments_count ?? 0 },
    queryFn: async () => {
      const [l, c] = await Promise.all([
        supabase.from("likes").select("post_id", { count: "exact", head: true }).eq("post_id", post.id),
        supabase.from("comments").select("post_id", { count: "exact", head: true }).eq("post_id", post.id),
      ]);
      return {
        likes: l.count ?? post.likes_count ?? 0,
        comments: c.count ?? post.comments_count ?? 0,
      };
    },
  });

  const toggleLike = useMutation({
    mutationFn: async (next: boolean) => {
      if (!user) throw new Error("Connexion requise");
      if (next) {
        const { error } = await supabase.from("likes").insert({ post_id: post.id, user_id: user.id });
        if (error && error.code !== "23505") throw error; // 23505 = déjà aimé
      } else {
        const { error } = await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", user.id);
        if (error) throw error;
      }
    },
    onMutate: async (next: boolean) => {
      await qc.cancelQueries({ queryKey: likedKey });
      await qc.cancelQueries({ queryKey: countsKey });
      const previousLiked = qc.getQueryData(likedKey);
      const previousCounts = qc.getQueryData(countsKey) as { likes: number; comments: number } | undefined;
      if (next) setLikePopKey((k) => k + 1);
      qc.setQueryData(likedKey, next);
      if (previousCounts) {
        qc.setQueryData(countsKey, { ...previousCounts, likes: Math.max(0, previousCounts.likes + (next ? 1 : -1)) });
      }
      return { previousLiked, previousCounts };
    },
    onError: (e: any, _next, context) => {
      qc.setQueryData(likedKey, context?.previousLiked);
      if (context?.previousCounts) qc.setQueryData(countsKey, context.previousCounts);
      toast.error("J'aime impossible : " + (e?.message ?? "erreur"));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: likedKey });
      qc.invalidateQueries({ queryKey: countsKey });
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
    if (!liked && user) toggleLike.mutate(true);
    setBurst(true);
    setTimeout(() => setBurst(false), 700);
  };

  return (
    <section className="relative h-[100dvh] w-full snap-start snap-always bg-black overflow-hidden">
      <div
        className="absolute inset-0 overflow-hidden transition-all duration-300 ease-out"
        style={{
          transform: showComments ? "scale(0.4) translateY(2%)" : "none",
          transformOrigin: "top center",
          borderRadius: showComments ? 28 : 0,
        }}
      >
      {showComments && (
        <div className="absolute inset-0 z-30" onClick={() => setShowComments(false)} />
      )}
      <video
        ref={videoRef}
        src={load ? post.media_urls?.[0] : undefined}
        preload={isActive ? "auto" : "metadata"}
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
      <div className={`absolute right-3 bottom-28 z-10 flex flex-col items-center gap-5 transition-opacity ${showComments ? "opacity-0 pointer-events-none" : ""}`}>
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

        <button onClick={() => toggleLike.mutate(!liked)} disabled={!user} className="flex flex-col items-center gap-1">
          <Heart
            key={likePopKey}
            className={`w-8 h-8 drop-shadow ${liked ? "fill-red-500 text-red-500 torque-pop" : "text-white"}`}
          />
          <span className="text-xs font-semibold text-white drop-shadow">{counts.likes}</span>
        </button>

        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
          <MessageCircle className="w-8 h-8 text-white drop-shadow" />
          <span className="text-xs font-semibold text-white drop-shadow">{counts.comments}</span>
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
      <div className={`absolute left-4 right-20 bottom-24 z-10 text-white transition-opacity ${showComments ? "opacity-0 pointer-events-none" : ""}`}>
        <Link to="/u/$username" params={{ username: profileParam }} className="font-bold text-sm drop-shadow">
          @{handle}
        </Link>
        {post.content && (
          <p className="text-sm mt-1 leading-snug drop-shadow line-clamp-3">{post.content}</p>
        )}
      </div>

      </div>

      {showComments && (
        <CommentsSheet postId={post.id} onClose={() => setShowComments(false)} onSent={invalidatePosts} variant="reel" />
      )}
    </section>
  );
}
