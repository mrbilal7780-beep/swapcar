import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} j`;
}

function Avatar({ profile, size = 36 }: { profile: any; size?: number }) {
  const label = (profile?.display_name ?? profile?.username ?? "?").slice(0, 2).toUpperCase();
  return profile?.avatar_url ? (
    <img
      src={profile.avatar_url}
      alt=""
      style={{ width: size, height: size }}
      className="rounded-full object-cover flex-shrink-0"
    />
  ) : (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center text-xs font-bold flex-shrink-0"
    >
      {label}
    </div>
  );
}

// Panneau de commentaires façon Instagram.
// variant "reel" : la vidéo reste visible au-dessus (aucun voile), "post" : léger voile sombre.
export function CommentsSheet({
  postId,
  onClose,
  onSent,
  variant = "post",
}: {
  postId: string;
  onClose: () => void;
  onSent: () => void;
  variant?: "reel" | "post";
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", postId],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true })
        .limit(300);
      if (error) throw error;
      if (!data?.length) return [];
      const ids = [...new Set(data.map((c: any) => c.user_id))];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      return data.map((c: any) => ({ ...c, author: map.get(c.user_id) ?? null }));
    },
  });

  const { data: me } = useQuery({
    queryKey: ["comment-me", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["comments", postId] });
    qc.invalidateQueries({ queryKey: ["post-counts", postId] });
    onSent();
  };

  const send = useMutation({
    mutationFn: async () => {
      const text = commentText.trim();
      if (!user || !text) return;
      const { error } = await supabase.from("comments").insert({ post_id: postId, user_id: user.id, content: text });
      if (error) throw error;
    },
    onSuccess: () => {
      setCommentText("");
      refresh();
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 250);
    },
    onError: (e: any) => toast.error("Commentaire non envoyé : " + (e?.message ?? "erreur")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comments").delete().eq("id", id).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: any) => toast.error("Suppression impossible : " + (e?.message ?? "erreur")),
  });

  if (!mounted) return null;

  const sheet = (
    <div
      className={`fixed inset-0 z-[80] flex flex-col justify-end ${variant === "post" ? "bg-black/50" : "pointer-events-none"}`}
      onClick={onClose}
    >
      <div
        className={`pointer-events-auto w-full max-w-2xl mx-auto bg-[#0f1218] border-t border-white/10 rounded-t-3xl flex flex-col animate-in slide-in-from-bottom duration-300 ${
          variant === "reel" ? "h-[58dvh]" : "h-[68dvh]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 pt-2 pb-1 px-4">
          <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-2" />
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm">
              Commentaires{comments.length > 0 ? ` · ${comments.length}` : ""}
            </h2>
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4 border-t border-white/5">
          {isLoading && <p className="text-center text-muted-foreground text-sm py-8">Chargement…</p>}
          {!isLoading && comments.length === 0 && (
            <div className="text-center py-10">
              <p className="font-semibold text-sm">Aucun commentaire</p>
              <p className="text-xs text-muted-foreground mt-1">Sois le premier à réagir.</p>
            </div>
          )}
          {comments.map((c: any) => {
            const ref = c.author?.username ?? c.user_id;
            return (
              <div key={c.id} className="flex gap-3">
                <Link to="/u/$username" params={{ username: ref }} onClick={onClose}>
                  <Avatar profile={c.author} />
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="text-xs">
                    <Link
                      to="/u/$username"
                      params={{ username: ref }}
                      onClick={onClose}
                      className="font-semibold"
                    >
                      {c.author?.username ?? c.author?.display_name ?? "Membre"}
                    </Link>
                    <span className="text-muted-foreground"> · {timeAgo(c.created_at)}</span>
                  </p>
                  <p className="text-sm leading-snug whitespace-pre-wrap break-words mt-0.5">{c.content}</p>
                </div>
                {user?.id === c.user_id && (
                  <button
                    onClick={() => remove.mutate(c.id)}
                    aria-label="Supprimer mon commentaire"
                    className="self-start p-1.5 text-muted-foreground hover:text-red-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {user ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!send.isPending) send.mutate();
            }}
            className="flex-shrink-0 flex items-center gap-2 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-white/10"
          >
            <Avatar profile={me} size={32} />
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Ajouter un commentaire…"
              maxLength={500}
              enterKeyHint="send"
              className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-[16px] focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || send.isPending}
              aria-label="Publier"
              className="w-10 h-10 bg-primary rounded-full flex items-center justify-center disabled:opacity-40 active:scale-95 transition flex-shrink-0"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        ) : (
          <p className="flex-shrink-0 text-center text-xs text-muted-foreground py-4 border-t border-white/10">
            Connecte-toi pour commenter.
          </p>
        )}
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
