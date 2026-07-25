import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { PageShell } from "@/components/layout/Header";
import { Settings, Grid3x3, Clapperboard, Car, ShieldCheck, X, UserMinus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { PostDetailModal } from "@/components/social/PostDetailModal";
import type { FeedPost } from "@/components/social/PostCard";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Mon profil — TORQUE" }] }),
  component: () => <RequireAuth><Profile /></RequireAuth>,
});

type Tab = "posts" | "reels";
type Modal = "followers" | "following" | null;

function Profile() {
  const { user, signOut } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("posts");
  const [modal, setModal] = useState<Modal>(null);
  const [openPostId, setOpenPostId] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      return data;
    },
  });

  const { data: myPosts = [] } = useQuery({
    queryKey: ["my-posts", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("author_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Liste des abonnés (ceux qui me suivent)
  const { data: followers = [] } = useQuery({
    queryKey: ["followers", userId],
    enabled: modal === "followers",
    queryFn: async () => {
      const { data } = await supabase
        .from("followings")
        .select("follower_id")
        .eq("following_id", userId);
      if (!data?.length) return [];
      const ids = data.map(f => f.follower_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", ids);
      return profiles ?? [];
    },
  });

  // Liste des abonnements (ceux que je suis)
  const { data: following = [] } = useQuery({
    queryKey: ["following", userId],
    enabled: modal === "following",
    queryFn: async () => {
      const { data } = await supabase
        .from("followings")
        .select("following_id")
        .eq("follower_id", userId);
      if (!data?.length) return [];
      const ids = data.map(f => f.following_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", ids);
      return profiles ?? [];
    },
  });

  // Se désabonner depuis la liste
  const unfollow = useMutation({
    mutationFn: async (targetId: string) => {
      const { error } = await supabase
        .from("followings")
        .delete()
        .eq("follower_id", userId)
        .eq("following_id", targetId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["following", userId] });
      qc.invalidateQueries({ queryKey: ["profile", userId] });
      toast.success("Désabonné");
    },
    onError: () => toast.error("Erreur"),
  });

  const photos = myPosts.filter((p: any) => p.media_type !== "video");
  const reels = myPosts.filter((p: any) => p.media_type === "video");
  const displayName = profile?.display_name ?? user!.email?.split("@")[0] ?? "Membre";
  const username = profile?.username ?? user!.email?.split("@")[0];
  const initials = displayName.slice(0, 2).toUpperCase();

  const toFeedPost = (p: any): FeedPost => ({
    ...p,
    author: {
      user_id: userId,
      display_name: profile?.display_name ?? null,
      username: profile?.username ?? null,
      avatar_url: profile?.avatar_url ?? null,
    },
  });
  const openPost = myPosts.find((p: any) => p.id === openPostId);

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold">{username}</h1>
          <Link to={"/settings" as any} className="p-2 hover:bg-white/5 rounded-lg transition">
            <Settings className="w-6 h-6" />
          </Link>
        </div>

        {/* Avatar + stats */}
        <div className="px-4 flex items-center gap-6 mb-4">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover border border-white/10 flex-shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center text-2xl font-black flex-shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 grid grid-cols-3 text-center">
            <div>
              <div className="text-lg font-bold">{profile?.posts_count ?? myPosts.length}</div>
              <div className="text-xs text-muted-foreground">Posts</div>
            </div>
            {/* Abonnés cliquable */}
            <button onClick={() => setModal("followers")} className="hover:opacity-70 transition">
              <div className="text-lg font-bold">{profile?.followers_count ?? 0}</div>
              <div className="text-xs text-muted-foreground">Abonnés</div>
            </button>
            {/* Abonnements cliquable */}
            <button onClick={() => setModal("following")} className="hover:opacity-70 transition">
              <div className="text-lg font-bold">{profile?.following_count ?? 0}</div>
              <div className="text-xs text-muted-foreground">Abonnements</div>
            </button>
          </div>
        </div>

        {/* Bio */}
        <div className="px-4 mb-3">
          <p className="font-semibold text-sm">{displayName}</p>
          {profile?.bio && <p className="text-sm mt-0.5">{profile.bio}</p>}
          {profile?.city && <p className="text-sm text-muted-foreground mt-0.5">{profile.city}</p>}
          {profile?.verified && (
            <span className="inline-flex items-center gap-1 text-xs text-primary mt-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Vérifié
            </span>
          )}
        </div>

        {/* Edit button */}
        <div className="px-4 mb-4">
          <Link to={"/settings" as any} className="block w-full text-center py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition">
            Modifier le profil
          </Link>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 border-t border-white/10">
          <TabButton active={tab === "posts"} onClick={() => setTab("posts")} icon={Grid3x3} />
          <TabButton active={tab === "reels"} onClick={() => setTab("reels")} icon={Clapperboard} />
          <Link
            to="/garage"
            className="flex items-center justify-center py-3 border-t-2 border-transparent text-muted-foreground hover:text-foreground transition"
          >
            <Car className="w-6 h-6" />
          </Link>
        </div>

        {/* Posts */}
        {tab === "posts" && (
          photos.length === 0 ? <EmptyState text="Aucune publication" /> : (
            <div className="grid grid-cols-3 gap-[2px]">
              {photos.map((p: any) => (
                <button key={p.id} onClick={() => setOpenPostId(p.id)} className="aspect-square bg-white/5">
                  {p.media_urls?.[0] && <img src={p.media_urls[0]} alt="" className="w-full h-full object-cover" />}
                </button>
              ))}
            </div>
          )
        )}

        {/* Reels */}
        {tab === "reels" && (
          reels.length === 0 ? <EmptyState text="Aucun reel" /> : (
            <div className="grid grid-cols-3 gap-[2px]">
              {reels.map((p: any) => (
                <button key={p.id} onClick={() => setOpenPostId(p.id)} className="aspect-[9/16] bg-white/5 relative">
                  {p.media_urls?.[0] && (
                    <video src={p.media_urls[0]} className="w-full h-full object-cover" muted />
                  )}
                </button>
              ))}
            </div>
          )
        )}

        {/* Déconnexion */}
        <div className="px-4 py-8 text-center">
          <button onClick={signOut} className="text-sm text-muted-foreground hover:text-red-400 transition">
            Déconnexion
          </button>
        </div>
      </div>

      {/* Modal Abonnés */}
      {modal === "followers" && (
        <Modal title={`Abonnés (${profile?.followers_count ?? 0})`} onClose={() => setModal(null)}>
          {followers.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">Aucun abonné pour le moment</p>
          ) : (
            followers.map((p: any) => (
              <UserRow
                key={p.user_id}
                profile={p}
                action={null}
              />
            ))
          )}
        </Modal>
      )}

      {/* Modal Abonnements */}
      {modal === "following" && (
        <Modal title={`Abonnements (${profile?.following_count ?? 0})`} onClose={() => setModal(null)}>
          {following.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">Tu ne suis personne encore</p>
          ) : (
            following.map((p: any) => (
              <UserRow
                key={p.user_id}
                profile={p}
                action={
                  <button
                    onClick={() => unfollow.mutate(p.user_id)}
                    disabled={unfollow.isPending}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400 transition px-3 py-1.5 rounded-full border border-white/10 hover:border-red-400/30"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    Se désabonner
                  </button>
                }
              />
            ))
          )}
        </Modal>
      )}

      {openPost && (
        <PostDetailModal post={toFeedPost(openPost)} onClose={() => setOpenPostId(null)} />
      )}
    </PageShell>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-card rounded-t-2xl border-t border-white/10 max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
          <h2 className="font-bold text-sm">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Modal content scrollable */}
        <div className="overflow-y-auto flex-1 px-4 py-2 divide-y divide-white/5">
          {children}
        </div>
      </div>
    </div>
  );
}

function UserRow({ profile, action }: { profile: any; action: React.ReactNode }) {
  const initials = (profile.display_name ?? profile.username ?? "?").slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-3 py-3">
      <Link
        to="/u/$username"
        params={{ username: profile.username ?? profile.user_id }}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center font-bold text-sm flex-shrink-0">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{profile.display_name ?? profile.username}</p>
          {profile.username && <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>}
        </div>
      </Link>
      {action}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <button onClick={onClick} className={`flex items-center justify-center py-3 border-t-2 transition ${active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"}`}>
      <Icon className="w-6 h-6" />
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="py-16 text-center text-muted-foreground text-sm">{text}</div>;
}