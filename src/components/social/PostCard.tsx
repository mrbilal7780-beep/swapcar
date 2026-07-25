import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Heart, MessageCircle, Share2, Trash2, Pencil, MoreHorizontal, Eye, X, Check } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CommentsSheet } from "@/components/social/CommentsSheet";

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
  views_count?: number;
  created_at: string;
  author?: PostAuthor | null;
};

export function PostCard({
  post,
  onDeleted,
  defaultShowComments = false,
}: {
  post: FeedPost;
  onDeleted?: () => void;
  defaultShowComments?: boolean;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showComments, setShowComments] = useState(defaultShowComments);
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(post.content);
  const [editText, setEditText] = useState(post.content ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isOwner = user?.id === post.author_id;

  const invalidatePosts = () => {
    qc.invalidateQueries({ queryKey: ["feed-foryou"] });
    qc.invalidateQueries({ queryKey: ["feed-following"] });
    qc.invalidateQueries({ queryKey: ["my-posts"] });
    qc.invalidateQueries({ queryKey: ["user-posts"] });
    qc.invalidateQueries({ queryKey: ["explore-posts"] });
  };

  // Like status
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

  const [likePopKey, setLikePopKey] = useState(0);
  const likedKey = ["post-liked", post.id, user?.id];
  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Connexion requise");
      if (liked) {
        await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      } else {
        await supabase.from("likes").insert({ post_id: post.id, user_id: user.id });
      }
      // Recalcule le compteur depuis la source de vérité plutôt que de dépendre d'un trigger DB
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

  // Delete post
  const deletePost = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("posts").delete().eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Publication supprimée");
      invalidatePosts();
      onDeleted?.();
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  // Edit post content
  const editPost = useMutation({
    mutationFn: async () => {
      const trimmed = editText.trim();
      if (!trimmed) throw new Error("La légende ne peut pas être vide");
      const { error } = await supabase.from("posts").update({ content: trimmed }).eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Publication modifiée");
      setContent(editText.trim());
      setEditing(false);
      invalidatePosts();
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur lors de la modification"),
  });

  const initials = (post.author?.display_name ?? post.author?.username ?? "?").slice(0, 2).toUpperCase();
  const handle = post.author?.username ?? post.author_id.slice(0, 8);
  // Toujours l'identifiant complet pour le routing — un handle tronqué ne matchera jamais un UUID en base
  const profileParam = post.author?.username ?? post.author_id;

  return (
    <article className="bg-background border-b border-white/5">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3">
        <Link to="/u/$username" params={{ username: profileParam }} className="flex items-center gap-3 flex-1">
          {post.author?.avatar_url ? (
            <img src={post.author.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center font-bold text-sm flex-shrink-0">
              {initials}
            </div>
          )}
          <div>
            <div className="font-semibold text-sm">{post.author?.display_name ?? handle}</div>
            <div className="text-xs text-muted-foreground">@{handle} · {timeAgo(post.created_at)}</div>
          </div>
        </Link>

        {/* Menu (modifier / supprimer si owner) */}
        {isOwner && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(s => !s)}
              className="p-2 hover:bg-white/5 rounded-full transition"
            >
              <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-10 bg-card border border-white/10 rounded-xl shadow-xl z-10 overflow-hidden min-w-[160px]">
                <button
                  onClick={() => { setEditing(true); setEditText(content ?? ""); setShowMenu(false); }}
                  className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-white/5 transition"
                >
                  <Pencil className="w-4 h-4" />
                  Modifier
                </button>
                <button
                  onClick={() => { setConfirmDelete(true); setShowMenu(false); }}
                  className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Caption / edit mode */}
      {editing ? (
        <div className="px-4 pb-3 space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => editPost.mutate()}
              disabled={editPost.isPending}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-semibold disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              {editPost.isPending ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button
              onClick={() => { setEditing(false); setEditText(content ?? ""); }}
              className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-xs font-semibold"
            >
              <X className="w-3.5 h-3.5" />
              Annuler
            </button>
          </div>
        </div>
      ) : (
        content && (
          <p className="px-4 pb-3 text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        )
      )}

      {/* Media */}
      {post.media_urls?.length > 0 && (
        <div className={`grid gap-[2px] ${post.media_urls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
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
          onClick={() => toggleLike.mutate()}
          disabled={!user || toggleLike.isPending}
          className="flex items-center gap-1.5 transition"
        >
          <Heart
            key={likePopKey}
            className={`w-6 h-6 transition ${liked ? "fill-red-500 text-red-500 torque-pop" : "text-foreground"}`}
          />
        </button>
        <button onClick={() => setShowComments(s => !s)} className="flex items-center gap-1.5">
          <MessageCircle className="w-6 h-6" />
        </button>
        <button
          onClick={async () => {
            const url = `${window.location.origin}/u/${profileParam}`;
            try {
              if (navigator.share) {
                await navigator.share({ title: "TORQUE", text: content ?? "", url });
              } else {
                await navigator.clipboard.writeText(url);
                toast.success("Lien copié !");
              }
            } catch {}
          }}
          className="ml-auto"
        >
          <Share2 className="w-6 h-6 text-muted-foreground" />
        </button>
      </div>

      {/* Likes count + views */}
      <div className="px-4 pt-1 pb-3">
        <div className="flex items-center gap-3">
          <p className="text-sm font-bold">{post.likes_count} j'aime</p>
          {typeof post.views_count === "number" && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="w-3.5 h-3.5" />
              {post.views_count} vues
            </span>
          )}
        </div>
        {post.comments_count > 0 && !showComments && (
          <button
            onClick={() => setShowComments(true)}
            className="text-sm text-muted-foreground mt-0.5"
          >
            Voir les {post.comments_count} commentaires
          </button>
        )}
      </div>

      {showComments && (
        <CommentsSheet postId={post.id} onClose={() => setShowComments(false)} onSent={invalidatePosts} />
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette publication ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive. La publication, ses likes et ses commentaires seront supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePost.mutate()}
              className="bg-red-600 text-white hover:bg-red-600/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}j`;
}
