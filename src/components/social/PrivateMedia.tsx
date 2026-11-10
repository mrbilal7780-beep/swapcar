import { createPortal } from "react-dom";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, Timer, X } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/image";
import { callApi } from "@/lib/push";

export const MAX_VIDEO_SECONDS = 45;
export const MAX_VIDEO_MB = 30;

function videoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(v.duration);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(NaN);
    };
    v.src = url;
  });
}

// Vérifie un fichier choisi (taille, durée). Renvoie false et affiche un message s'il est refusé.
export async function checkPickedFile(f: File): Promise<boolean> {
  if (f.type.startsWith("video/")) {
    if (f.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast.error(`Vidéo trop lourde (${MAX_VIDEO_MB} Mo maximum).`);
      return false;
    }
    const d = await videoDuration(f);
    if (Number.isFinite(d) && d > MAX_VIDEO_SECONDS) {
      toast.error(`Vidéo trop longue (${MAX_VIDEO_SECONDS} secondes maximum).`);
      return false;
    }
  }
  return true;
}

// Prépare le fichier à envoyer : photo réduite et recompressée, vidéo telle quelle.
export async function prepareUpload(file: File): Promise<{ blob: Blob; ext: string; isVideo: boolean }> {
  const isVideo = file.type.startsWith("video/");
  let blob: Blob = file;
  let ext = (file.name.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase();
  if (!isVideo) {
    try {
      blob = await compressImage(file, { maxSize: 1280, quality: 0.8 });
      ext = "jpg";
    } catch {
      /* format illisible : on tente l'envoi tel quel */
    }
  }
  return { blob, ext, isVideo };
}

export function friendlyUploadError(e: any): string {
  const msg = String(e?.message ?? "");
  if (/mime|type/i.test(msg) && /support|allow|invalid/i.test(msg)) {
    return "Format non pris en charge : utilise une photo JPG/PNG ou une vidéo MP4.";
  }
  return msg || "Envoi impossible";
}

// Photo / vidéo « normale » : lien temporaire demandé au serveur (jamais d'adresse publique)
export function NormalMedia({
  action,
  messageId,
  type,
}: {
  action: "dm-media-url" | "media-url";
  messageId: string;
  type: string;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["private-media", action, messageId],
    staleTime: 50 * 60 * 1000,
    retry: false,
    queryFn: () => callApi<{ url: string }>(action, { message_id: messageId }),
  });
  if (isLoading) return <div className="w-56 h-56 rounded-xl bg-white/5 animate-pulse" />;
  if (isError || !data?.url) {
    return (
      <div className="w-56 h-24 rounded-xl bg-white/5 flex items-center justify-center text-xs text-muted-foreground">
        Média indisponible
      </div>
    );
  }
  return type === "video" ? (
    <video src={data.url} controls playsInline preload="metadata" className="max-w-[230px] max-h-72 rounded-xl bg-black" />
  ) : (
    <img src={data.url} alt="" className="max-w-[230px] max-h-72 rounded-xl object-cover" />
  );
}

// Pastille d'un média à vue unique
export function ViewOnceTile({
  mine,
  opened,
  type,
  onOpen,
}: {
  mine: boolean;
  opened: boolean;
  type: string;
  onOpen: () => void;
}) {
  const label = type === "video" ? "Vidéo" : "Photo";
  if (mine) {
    return (
      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl rounded-br-md bg-primary/20 border border-primary/30 text-sm">
        <Timer className="w-4 h-4" /> {label} à vue unique envoyée
      </div>
    );
  }
  if (opened) {
    return (
      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-white/5 border border-white/10 text-sm text-muted-foreground">
        <EyeOff className="w-4 h-4" /> Ouvert
      </div>
    );
  }
  return (
    <button
      onClick={onOpen}
      className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-primary text-primary-foreground text-sm font-semibold active:scale-95 transition"
    >
      <Eye className="w-4 h-4" /> {label} · touche pour voir (1 fois)
    </button>
  );
}

// Visionneuse plein écran : se ferme toute seule (photo 12 s, vidéo à la fin ou 60 s)
export function ViewOnceViewer({
  viewer,
  onClose,
}: {
  viewer: { url: string; type: string } | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!viewer) return;
    const t = setTimeout(onClose, viewer.type === "video" ? 60000 : 12000);
    return () => clearTimeout(t);
  }, [viewer, onClose]);

  if (!viewer || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black flex flex-col" onContextMenu={(e) => e.preventDefault()}>
      <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-white/80">
          <Timer className="w-4 h-4" /> Vue unique
        </span>
        <button onClick={onClose} aria-label="Fermer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center p-2">
        {viewer.type === "video" ? (
          <video
            src={viewer.url}
            autoPlay
            playsInline
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            onEnded={onClose}
            className="max-w-full max-h-full"
          />
        ) : (
          <img src={viewer.url} alt="" draggable={false} className="max-w-full max-h-full object-contain select-none" />
        )}
      </div>
    </div>,
    document.body
  );
}
