import { X } from "lucide-react";
import { PostCard, type FeedPost } from "@/components/social/PostCard";

export function PostDetailModal({ post, onClose }: { post: FeedPost; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-card sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end px-2 py-2 sticky top-0 bg-card z-10">
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <PostCard post={post} defaultShowComments />
      </div>
    </div>
  );
}
