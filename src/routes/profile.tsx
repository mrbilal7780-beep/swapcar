import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { PageShell } from "@/components/layout/Header";
import { Settings, Grid3x3, Clapperboard, Car, ShieldCheck } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Mon profil — TORQUE" },
      { name: "description", content: "Gérez votre profil, vos publications et votre garage." },
      { property: "og:title", content: "Mon profil — TORQUE" },
      { property: "og:description", content: "Votre tableau de bord TORQUE." },
    ],
  }),
  component: () => <RequireAuth><Profile /></RequireAuth>,
});

type Tab = "posts" | "reels" | "garage";

function Profile() {
  const { user, signOut } = useAuth();
  const userId = user!.id;
  const [tab, setTab] = useState<Tab>("posts");

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
      return data;
    },
  });

  const { data: myCars = [] } = useQuery({
    queryKey: ["my-vehicles", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: myPosts = [] } = useQuery({
    queryKey: ["my-posts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("author_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const photos = myPosts.filter((p) => p.media_type !== "video");
  const reels = myPosts.filter((p) => p.media_type === "video");
  const initials = (profile?.display_name ?? user!.email ?? "?").slice(0, 2).toUpperCase();
  const username = profile?.username ?? user!.email?.split("@")[0];

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold">{username}</h1>
          <Link
            to={"/settings" as any}
            className="p-2 -mr-2 hover:bg-white/5 rounded-lg transition"
            aria-label="Paramètres"
          >
            <Settings className="w-6 h-6" />
          </Link>
        </div>

        {/* Avatar + stats */}
        <div className="px-4 flex items-center gap-6 mb-4">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={username}
              className="w-20 h-20 rounded-full object-cover border border-white/10 flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center text-2xl font-black flex-shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 grid grid-cols-3 text-center">
            <StatBlock value={profile?.posts_count ?? myPosts.length} label="Posts" />
            <StatBlock value={profile?.followers_count ?? 0} label="Abonnés" />
            <StatBlock value={profile?.following_count ?? 0} label="Abonnements" />
          </div>
        </div>

        {/* Bio */}
        <div className="px-4 mb-3">
          <p className="font-semibold text-sm">{profile?.display_name ?? user!.email}</p>
          {profile?.bio && (
            <p className="text-sm text-foreground/90 whitespace-pre-line mt-0.5">{profile.bio}</p>
          )}
          {profile?.city && (
            <p className="text-sm text-muted-foreground mt-0.5">{profile.city}</p>
          )}
          {profile?.verified && (
            <span className="inline-flex items-center gap-1 text-xs text-primary mt-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Identité vérifiée
            </span>
          )}
        </div>

        {/* Edit button */}
        <div className="px-4 mb-4">
          <Link
            to={"/settings" as any}
            className="block w-full text-center py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition"
          >
            Modifier le profil
          </Link>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 border-t border-white/10">
          <TabButton active={tab === "posts"} onClick={() => setTab("posts")} icon={Grid3x3} />
          <TabButton active={tab === "reels"} onClick={() => setTab("reels")} icon={Clapperboard} />
          <TabButton active={tab === "garage"} onClick={() => setTab("garage")} icon={Car} />
        </div>

        {/* Posts */}
        {tab === "posts" && (
          photos.length === 0 ? (
            <EmptyState text="Aucune publication" />
          ) : (
            <div className="grid grid-cols-3 gap-[2px]">
              {photos.map((p) => (
                <div key={p.id} className="aspect-square bg-white/5">
                  {p.media_urls?.[0] && (
                    <img src={p.media_urls[0]} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* Reels */}
        {tab === "reels" && (
          reels.length === 0 ? (
            <EmptyState text="Aucun reel" />
          ) : (
            <div className="grid grid-cols-3 gap-[2px]">
              {reels.map((p) => (
                <div key={p.id} className="aspect-[9/16] bg-white/5">
                  {p.media_urls?.[0] && (
                    <video src={p.media_urls[0]} className="w-full h-full object-cover" muted />
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* Garage */}
        {tab === "garage" && (
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Mon garage</h2>
              <Link
                to="/add-vehicle"
                className="text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-full font-semibold"
              >
                + Ajouter
              </Link>
            </div>
            {myCars.length === 0 ? (
              <EmptyState text="Aucun véhicule pour le moment" />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {myCars.map((c) => (
                  <Link
                    key={c.id}
                    to="/vehicle/$id"
                    params={{ id: c.id }}
                    className="rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-primary/50 transition"
                  >
                    {c.photos?.[0] ? (
                      <img src={c.photos[0]} alt={c.brand} className="w-full aspect-[4/3] object-cover" />
                    ) : (
                      <div className="w-full aspect-[4/3] bg-secondary flex items-center justify-center">
                        <Car className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="p-3">
                      <div className="font-bold text-sm">{c.brand} {c.model}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {c.year} · {Number(c.price).toLocaleString("fr-FR")} €
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Déconnexion */}
        <div className="px-4 py-8 text-center">
          <button
            onClick={signOut}
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            Déconnexion
          </button>
        </div>
      </div>
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
    <div className="py-16 text-center text-muted-foreground text-sm">
      {text}
    </div>
  );
}