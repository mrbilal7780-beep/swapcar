import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function PostComposer() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Connexion requise");
      if (!content.trim() && files.length === 0) throw new Error("Ajoute du texte ou une photo");
      setUploading(true);
      try {
        const urls: string[] = [];
        let mediaType: "image" | "video" = "image";
        for (const f of files) {
          const ext = f.name.split(".").pop();
          const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
          const { error } = await supabase.storage.from("post-media").upload(path, f);
          if (error) throw error;
          const { data } = supabase.storage.from("post-media").getPublicUrl(path);
          urls.push(data.publicUrl);
          if (f.type.startsWith("video")) mediaType = "video";
        }
        const { error } = await supabase.from("posts").insert({
          author_id: user.id,
          content: content.trim() || null,
          media_urls: urls,
          media_type: mediaType,
        });
        if (error) throw error;
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      setContent("");
      setFiles([]);
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  if (!user) return null;

  return (
    <div className="glass rounded-3xl p-5 mb-6">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Partage ta passion auto…"
        rows={3}
        className="input w-full resize-none"
      />
      {files.length > 0 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {files.map((f, i) => (
            <div key={i} className="relative">
              <img src={URL.createObjectURL(f)} alt="" className="w-20 h-20 object-cover rounded-xl" />
              <button
                onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-xs"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-4">
        <label className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition flex items-center gap-2">
          <span>📷</span> Ajouter média
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => setFiles((p) => [...p, ...Array.from(e.target.files ?? [])].slice(0, 4))}
          />
        </label>
        <button
          onClick={() => create.mutate()}
          disabled={uploading || create.isPending || (!content.trim() && !files.length)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-full text-sm font-semibold glow disabled:opacity-50"
        >
          {uploading ? "Publication…" : "Publier"}
        </button>
      </div>
      {create.error && <p className="text-destructive text-xs mt-2">{(create.error as Error).message}</p>}
    </div>
  );
}