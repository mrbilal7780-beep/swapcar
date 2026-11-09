import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { PostCard, type FeedPost } from "@/components/social/PostCard";

// Affichage d'une publication ouverte depuis une grille de profil : média en entier,
// légende, j'aime et commentaires. Les commentaires s'ouvrent à la demande (pas d'office).
export function PostDetailModal({ post, onClose }: { post: FeedPost; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full sm:max-w-lg bg-[#0f1218] border border-white/10 sm:rounded-3xl rounded-t-3xl max-h-[94dvh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-20 flex justify-end px-2 pt-2 pb-1 bg-[#0f1218]">
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <PostCard post={post} detail onDeleted={onClose} />
      </div>
    </div>,
    document.body
  );
}
