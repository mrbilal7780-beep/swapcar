import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { PageShell } from "@/components/layout/Header";
import { ArrowLeft, ImagePlus, Video, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/create-post")({
  head: () => ({ meta: [{ title: "Nouvelle publication — TORQUE" }] }),
  component: () => <RequireAuth><CreatePost /></RequireAuth>,
});

type MediaType = "photo" | "video" | null;

function CreatePost() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mediaType, setMediaType] = useState<MediaType>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const handlePickMedia = (type: MediaType) => {
    setMediaType(type);
    if (fileRef.current) {
      fileRef.current.accept = type === "photo" ? "image/*" : "video/*";
      fileRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    setMediaType(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handlePublish = async () => {
    if (!caption.trim() && !file) {
      toast.error("Ajoute une photo, une vidéo ou une légende");
      return;
    }

    setUploading(true);
    let mediaUrl: string | null = null;

    if (file && user) {
      const ext = file.name.split(".").pop();
      const path = `posts/${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(path, file);

      if (uploadError) {
        toast.error("Erreur lors de l'upload du fichier");
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("post-media")
        .getPublicUrl(path);
      mediaUrl = urlData.publicUrl;
    }

    const { error: insertError } = await supabase.from("posts").insert({
      author_id: user!.id,
      content: caption.trim(),
      media_urls: mediaUrl ? [mediaUrl] : [],
      media_type: mediaType === "video" ? "video" : "image",
      likes_count: 0,
      comments_count: 0,
    });

    setUploading(false);

    if (insertError) {
      toast.error("Erreur lors de la publication");
      return;
    }

    toast.success("Publication créée !");
    navigate({ to: "/feed" } as any);
  };

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center justify-between py-3">
          <button
            onClick={() => navigate({ to: "/feed" } as any)}
            className="p-2 -ml-2 hover:bg-white/5 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Nouvelle publication</h1>
          <button
            onClick={handlePublish}
            disabled={uploading}
            className="text-sm font-bold text-primary hover:text-primary/80 disabled:opacity-40 transition"
          >
            {uploading ? "..." : "Publier"}
          </button>
        </div>

        {/* Choisir type si pas encore choisi */}
        {!file && (
          <div className="grid grid-cols-2 gap-4 mt-6">
            <button
              onClick={() => handlePickMedia("photo")}
              className="flex flex-col items-center justify-center gap-3 aspect-square rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/10 transition"
            >
              <ImagePlus className="w-10 h-10 text-primary" />
              <span className="text-sm font-semibold">Photo</span>
            </button>
            <button
              onClick={() => handlePickMedia("video")}
              className="flex flex-col items-center justify-center gap-3 aspect-square rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/10 transition"
            >
              <Video className="w-10 h-10 text-primary" />
              <span className="text-sm font-semibold">Vidéo / Reel</span>
            </button>
          </div>
        )}

        {/* Input fichier caché */}
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Aperçu */}
        {preview && (
          <div className="mt-4 relative rounded-2xl overflow-hidden">
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 z-10 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition"
            >
              <X className="w-4 h-4" />
            </button>
            {mediaType === "photo" ? (
              <img
                src={preview}
                alt="Aperçu"
                className="w-full max-h-96 object-cover rounded-2xl"
              />
            ) : (
              <video
                src={preview}
                controls
                className="w-full max-h-96 rounded-2xl bg-black"
              />
            )}
          </div>
        )}

        {/* Légende */}
        <div className="mt-4">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Ajoute une légende..."
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
          />
        </div>

        {/* Bouton publier */}
        {(file || caption.trim()) && (
          <button
            onClick={handlePublish}
            disabled={uploading}
            className="w-full mt-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-3 rounded-xl font-semibold transition"
          >
            {uploading ? "Publication en cours..." : "Publier"}
          </button>
        )}

      </div>
    </PageShell>
  );
}