import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { PageShell } from "@/components/layout/Header";
import { Search, X, Grid3x3, Users } from "lucide-react";

export const Route = createFileRoute("/explore")({
  head: () => ({ meta: [{ title: "Explorer — TORQUE" }] }),
  component: () => <RequireAuth><Explore /></RequireAuth>,
});

type Tab = "posts" | "people";

function Explore() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("posts");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce la recherche
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Posts populaires (no search)
  const { data: popularPosts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ["explore-posts", debouncedQuery],
    queryFn: async () => {
      let q = supabase
        .from("posts")
        .select(`
          *,
          profiles!posts_author_id_fkey (
            user_id, display_name, username, avatar_url
          )
        `)
        .order("likes_count", { ascending: false })
        .limit(30);

      if (debouncedQuery.trim()) {
        q = q.ilike("content", `%${debouncedQuery}%`);
      }

      const { data } = await q;
      return data ?? [];
    },
  });

  // Recherche utilisateurs
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["explore-users", debouncedQuery],
    enabled: tab === "people",
    queryFn: async () => {
      if (!debouncedQuery.trim()) {
        // Suggestions : membres les plus actifs
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .neq("user_id", user?.id ?? "")
          .order("followers_count", { ascending: false })
          .limit(20);
        return data ?? [];
      }
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .neq("user_id", user?.id ?? "")
        .or(`username.ilike.%${debouncedQuery}%,display_name.ilike.%${debouncedQuery}%`)
        .limit(30);
      return data ?? [];
    },
  });

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">

        {/* Barre de recherche */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-white/5 px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher des posts, membres..."
              className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-3">
            <TabPill active={tab === "posts"} onClick={() => setTab("posts")} icon={Grid3x3} label="Publications" />
            <TabPill active={tab === "people"} onClick={() => setTab("people")} icon={Users} label="Membres" />
          </div>
        </div>

        {/* Posts en grille */}
        {tab === "posts" && (
          <>
            {loadingPosts && (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}
            {!loadingPosts && popularPosts.length === 0 && (
              <div className="text-center py-16 text-muted-foreground text-sm">
                {debouncedQuery ? `Aucun résultat pour "${debouncedQuery}"` : "Aucune publication"}
              </div>
            )}
            {!loadingPosts && popularPosts.length > 0 && (
              <div className="grid grid-cols-3 gap-[2px]">
                {popularPosts.map((p: any) => (
                  <PostThumb key={p.id} post={p} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Membres */}
        {tab === "people" && (
          <div className="px-4 py-3">
            {loadingUsers && (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}
            {!loadingUsers && users.length === 0 && (
              <div className="text-center py-16 text-muted-foreground text-sm">
                {debouncedQuery ? `Aucun membre pour "${debouncedQuery}"` : "Aucun membre trouvé"}
              </div>
            )}
            {!loadingUsers && (
              <div className="space-y-1">
                {!debouncedQuery && (
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
                    Membres populaires
                  </p>
                )}
                {users.map((p: any) => (
                  <Link
                    key={p.user_id}
                    to="/u/$username"
                    params={{ username: p.username ?? p.user_id }}
                    className="flex items-center gap-3 py-2.5 hover:opacity-80 transition"
                  >
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {(p.display_name ?? "?").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{p.display_name ?? p.username}</p>
                      <p className="text-xs text-muted-foreground">
                        @{p.username} · {p.followers_count ?? 0} abonnés
                      </p>
                    </div>
                    <span className="text-xs text-primary font-semibold">Voir →</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}

function PostThumb({ post }: { post: any }) {
  const [open, setOpen] = useState(false);
  const profile = post.profiles;
  const handle = profile?.username ?? profile?.user_id?.slice(0, 8);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="aspect-square bg-white/5 relative group overflow-hidden"
      >
        {post.media_urls?.[0] ? (
          post.media_type === "video" ? (
            <video src={post.media_urls[0]} className="w-full h-full object-cover" muted />
          ) : (
            <img src={post.media_urls[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center p-2">
            <p className="text-xs text-muted-foreground text-center line-clamp-3">{post.content}</p>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3 text-white text-xs font-bold">
          <span>❤️ {post.likes_count}</span>
          <span>💬 {post.comments_count}</span>
        </div>
      </button>

      {/* Modal post detail */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-card rounded-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-3 border-b border-white/5">
              <Link
                to="/u/$username"
                params={{ username: handle }}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center font-bold text-xs">
                  {(profile?.display_name ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <span className="font-semibold text-sm">@{handle}</span>
              </Link>
              <button onClick={() => setOpen(false)} className="ml-auto p-1">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Media */}
            {post.media_urls?.[0] && (
              post.media_type === "video" ? (
                <video src={post.media_urls[0]} controls className="w-full max-h-80 object-cover bg-black" />
              ) : (
                <img src={post.media_urls[0]} alt="" className="w-full max-h-80 object-cover" />
              )
            )}

            {/* Content */}
            {post.content && (
              <div className="p-3">
                <p className="text-sm">{post.content}</p>
              </div>
            )}

            {/* Stats + link */}
            <div className="px-3 pb-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">❤️ {post.likes_count} · 💬 {post.comments_count}</span>
              <Link
                to="/u/$username"
                params={{ username: handle }}
                onClick={() => setOpen(false)}
                className="text-primary text-xs font-semibold"
              >
                Voir le profil →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TabPill({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}