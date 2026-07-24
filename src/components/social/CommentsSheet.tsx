import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { X } from "lucide-react";
import { toast } from "sonner";

export function CommentsSheet({
  postId,
  onClose,
  onSent,
}: {
  postId: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [commentText, setCommentText] = useState("");

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (!data?.length) return [];
      const ids = [...new Set(data.map((c) => c.user_id))];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", ids);
      const map = new Map(profs?.map((p) => [p.user_id, p]) ?? []);
      return data.map((c) => ({ ...c, author: map.get(c.user_id) ?? null }));
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!user || !commentText.trim()) return;
      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        user_id: user.id,
        content: commentText.trim(),
      });
      if (error) throw error;
      const { count } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);
      await supabase.from("posts").update({ comments_count: count ?? 0 }).eq("id", postId);
    },
    onSuccess: () => {
      setCommentText("");
      qc.invalidateQueries({ queryKey: ["comments", postId] });
      onSent();
    },
    onError: (e: any) => toast.error("Erreur : " + e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-card rounded-t-2xl border-t border-white/10 max-h-[65vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
          <h2 className="font-bold text-sm">Commentaires</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
          {comments.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">Sois le premier à commenter</p>
          )}
          {comments.map((c: any) => (
            <div key={c.id} className="flex gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center text-xs font-bold shrink-0">
                {(c.author?.display_name ?? "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <span className="font-semibold text-xs">{c.author?.display_name ?? "Membre"} </span>
                <span className="text-sm">{c.content}</span>
              </div>
            </div>
          ))}
        </div>

        {user && (
          <form
            onSubmit={(e) => { e.preventDefault(); send.mutate(); }}
            className="flex gap-2 p-3 border-t border-white/10 flex-shrink-0"
          >
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Ajouter un commentaire…"
              className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || send.isPending}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-full font-semibold disabled:opacity-50 text-sm"
            >
              →
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
