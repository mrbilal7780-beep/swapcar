import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/Header";
import { type FeedPost } from "@/components/social/PostCard";
import { PostDetailModal } from "@/components/social/PostDetailModal";
import { useAuth } from "@/lib/auth";
import { Grid3x3, Car, ArrowLeft } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — TORQUE` },
      { name: "description", content: `Profil de @${params.username} sur TORQUE.` },
    ],
  }),
  component: PublicProfile,
});

type Tab = "posts" | "garage";

function PublicProfile() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("posts");
  const [openPostId, setOpenPostId] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-by-username", username],
    queryFn: async () => {
      // .eq() is parameterized (safe against special chars in username, unlike raw .or() string interpolation)
      const { data: byUsername } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .maybeSingle();
      if (byUsername) return byUsername;

      // Fallback: the param can be a raw user_id when the author has no username set
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username);
      if (!isUuid) return null;
      const { data: byId } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", username)
        .maybeSingle();
      return byId;
    },
  });

  const profileUserId = profile?.user_id;

  const { data: posts = [] } = useQuery<FeedPost[]>({
    queryKey: ["user-posts", profileUserId],
    enabled: !!profileUserId,
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("author_id", profileUserId!)
        .order("created_at", { ascending: false });
      return (data ?? []).map((p) => ({ ...p, author: profile ?? null }));
    },
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["user-vehicles", profileUserId],
    enabled: !!profileUserId,
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("*")
        .eq("owner_id", profileUserId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: isFollowing } = useQuery({
    queryKey: ["is-following", profileUserId, user?.id],
    enabled: !!profileUserId && !!user && profileUserId !== user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("followings")
        .select("id")
        .eq("follower_id", user!.id)
        .eq("following_id", profileUserId!)
        .maybeSingle();
      return !!data;
    },
  });

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (!user || !profileUserId) return;
      if (isFollowing) {
        await supabase
          .from("followings")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profileUserId);
      } else {
        await supabase
          .from("followings")
          .insert({ follower_id: user.id, following_id: profileUserId });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["is-following"] });
      qc.invalidateQueries({ queryKey: ["profile-by-username", username] });
    },
  });

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </PageShell>
    );
  }

  if (!profile) {
    return (
      <PageShell>
        <div className="text-center py-32 text-muted-foreground">
          Profil introuvable.
        </div>
      </PageShell>
    );
  }

  const initials = (profile.display_name ?? profile.username ?? "?").slice(0, 2).toUpperCase();
  const isMe = user?.id === profileUserId;
  const handle = profile.username ?? profileUserId?.slice(0, 8);
  const photos = posts.filter((p) => p.media_type !== "video");
  const openPost = posts.find((p) => p.id === openPostId);

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">

        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => window.history.back()}
            className="p-2 -ml-2 hover:bg-white/5 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">@{handle}</h1>
        </div>

        {/* Avatar + stats */}
        <div className="px-4 flex items-center gap-6 mb-4">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="w-20 h-20 rounded-full object-cover border border-white/10 flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center text-2xl font-black flex-shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 grid grid-cols-3 text-center">
            <StatBlock value={profile.posts_count ?? posts.length} label="Posts" />
            <StatBlock value={profile.followers_count ?? 0} label="Abonnés" />
            <StatBlock value={profile.following_count ?? 0} label="Abonnements" />
          </div>
        </div>

        {/* Bio */}
        <div className="px-4 mb-4">
          <p className="font-semibold text-sm">{profile.display_name ?? handle}</p>
          {profile.bio && <p className="text-sm mt-0.5">{profile.bio}</p>}
          {profile.city && <p className="text-sm text-muted-foreground mt-0.5">{profile.city}</p>}
        </div>

        {/* Follow / Message buttons */}
        {!isMe && user && (
          <div className="px-4 mb-4 flex gap-2">
            <button
              onClick={() => toggleFollow.mutate()}
              disabled={toggleFollow.isPending}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                isFollowing
                  ? "bg-white/5 border border-white/10 hover:bg-white/10"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {isFollowing ? "Abonné ✓" : "S'abonner"}
            </button>
            <Link
              to="/chat"
              search={{ with: profileUserId }}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-center bg-white/5 border border-white/10 hover:bg-white/10 transition"
            >
              Message
            </Link>
          </div>
        )}

        {/* Tabs */}
        <div className="grid grid-cols-2 border-t border-white/10">
          <TabButton active={tab === "posts"} onClick={() => setTab("posts")} icon={Grid3x3} />
          <TabButton active={tab === "garage"} onClick={() => setTab("garage")} icon={Car} />
        </div>

        {/* Posts grid */}
        {tab === "posts" && (
          photos.length === 0 ? (
            <EmptyState text="Aucune publication" />
          ) : (
            <div className="grid grid-cols-3 gap-[2px]">
              {photos.map((p) => (
                <button key={p.id} onClick={() => setOpenPostId(p.id)} className="aspect-square bg-white/5">
                  {p.media_urls?.[0] && (
                    <img src={p.media_urls[0]} alt="" className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )
        )}

        {/* Garage */}
        {tab === "garage" && (
          vehicles.length === 0 ? (
            <EmptyState text="Aucun véhicule" />
          ) : (
            <div className="grid grid-cols-2 gap-3 px-4 py-4">
              {vehicles.map((v: any) => (
                <div key={v.id} className="rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                  {v.photos?.[0] ? (
                    <img src={v.photos[0]} alt="" className="w-full aspect-[4/3] object-cover" />
                  ) : (
                    <div className="w-full aspect-[4/3] bg-secondary flex items-center justify-center">
                      <Car className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="font-bold text-sm">{v.make} {v.model}</p>
                    <p className="text-xs text-muted-foreground">{v.year}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

      </div>

      {openPost && (
        <PostDetailModal post={openPost} onClose={() => setOpenPostId(null)} />
      )}
    </PageShell>
  );
}

function StatBlock({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center py-3 border-t-2 transition ${
        active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"
      }`}
    >
      <Icon className="w-6 h-6" />
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-16 text-center text-muted-foreground text-sm">{text}</div>
  );
}