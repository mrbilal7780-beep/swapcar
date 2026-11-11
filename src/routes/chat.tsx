import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { PageShell } from "@/components/layout/Header";
import { Send, ArrowLeft, SquarePen, Palette, Check, X, Plus, Camera, Image as ImageIcon, Timer } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { callApi } from "@/lib/push";
import {
  NormalMedia,
  ViewOnceTile,
  ViewOnceViewer,
  checkPickedFile,
  friendlyUploadError,
  prepareUpload,
} from "@/components/social/PrivateMedia";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Messages — TORQUE" }] }),
  validateSearch: z.object({ with: z.string().optional() }),
  component: () => <RequireAuth><ChatPage /></RequireAuth>,
});

// Fonds d'écran disponibles (les clés doivent rester identiques à celles du script SQL).
const WALLPAPERS: Record<string, { label: string; css: string }> = {
  default: { label: "Classique", css: "none" },
  midnight: { label: "Minuit", css: "linear-gradient(160deg,#0b1020 0%,#16233f 100%)" },
  carbon: { label: "Carbone", css: "repeating-linear-gradient(45deg,#0c0c0f 0 6px,#14141a 6px 12px)" },
  sunset: { label: "Sunset", css: "linear-gradient(160deg,#1b0f1f 0%,#4a1d3a 55%,#a8442b 100%)" },
  circuit: {
    label: "Circuit",
    css: "linear-gradient(115deg,transparent 0 46%,rgba(0,122,255,.2) 46% 54%,transparent 54% 100%),linear-gradient(160deg,#08080c,#10131c)",
  },
  neon: {
    label: "Néon",
    css: "radial-gradient(circle at 20% 10%,rgba(0,122,255,.35),transparent 45%),radial-gradient(circle at 85% 90%,rgba(168,85,247,.3),transparent 45%),linear-gradient(#07070b,#07070b)",
  },
  forest: { label: "Forêt", css: "linear-gradient(160deg,#07140f 0%,#0f2a1e 100%)" },
  steel: { label: "Acier", css: "linear-gradient(160deg,#101216 0%,#2a2f38 100%)" },
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  return d.toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
}

function Avatar({ profile, size = 40 }: { profile: any; size?: number }) {
  const label = (profile?.display_name ?? profile?.username ?? "?").slice(0, 2).toUpperCase();
  return profile?.avatar_url ? (
    <img
      src={profile.avatar_url}
      alt=""
      style={{ width: size, height: size }}
      className="rounded-full object-cover flex-shrink-0 border border-white/10"
    />
  ) : (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center font-bold text-xs flex-shrink-0"
    >
      {label}
    </div>
  );
}

function ChatPage() {
  const { user } = useAuth();
  const { with: withUserId } = Route.useSearch();
  const navigate = Route.useNavigate();
  // Un lien "Message" depuis un profil (?with=user_id) ouvre directement la conversation,
  // même si aucun message n'a encore été échangé avec cette personne.
  const [selectedUserId, setSelectedUserId] = useState<string | null>(withUserId ?? null);

  useEffect(() => {
    if (withUserId) setSelectedUserId(withUserId);
  }, [withUserId]);

  // Liste des conversations (personnes avec qui on a échangé)
  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });

      if (!data?.length) return [];

      // Grouper par interlocuteur
      const seen = new Set<string>();
      const convos: any[] = [];
      for (const msg of data) {
        const otherId = msg.sender_id === user!.id ? msg.receiver_id : msg.sender_id;
        if (!seen.has(otherId)) {
          seen.add(otherId);
          convos.push({ otherId, lastMessage: msg });
        }
      }

      // Charger les profils
      const ids = convos.map((c) => c.otherId);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", ids);

      const map = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);
      return convos.map((c) => ({ ...c, profile: map.get(c.otherId) ?? null }));
    },
  });

  if (selectedUserId) {
    return (
      <Conversation
        myId={user!.id}
        otherId={selectedUserId}
        onBack={() => {
          setSelectedUserId(null);
          navigate({ search: {} });
        }}
      />
    );
  }

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <h1 className="text-lg font-bold">Messages</h1>
          <Link
            to={"/search-users" as any}
            className="p-2 hover:bg-white/5 rounded-full transition"
            aria-label="Nouveau message"
          >
            <SquarePen className="w-5 h-5" />
          </Link>
        </div>

        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-8 text-center gap-3">
            <p className="text-lg font-bold">Aucun message</p>
            <p className="text-sm text-muted-foreground">
              Trouve des membres et envoie-leur le premier message
            </p>
            <Link
              to={"/search-users" as any}
              className="mt-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold text-sm"
            >
              Trouver des membres
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {conversations.map((conv) => (
              <button
                key={conv.otherId}
                onClick={() => setSelectedUserId(conv.otherId)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-left"
              >
                <Avatar profile={conv.profile} size={48} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {conv.profile?.display_name ?? conv.profile?.username ?? "Membre"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {conv.lastMessage.sender_id === user!.id ? "Toi : " : ""}
                    {conv.lastMessage.media_path ? (conv.lastMessage.media_type === "video" ? "Vidéo" : "Photo") : conv.lastMessage.content}
                  </p>
                </div>
                <span className="text-[11px] text-muted-foreground flex-shrink-0">
                  {timeLabel(conv.lastMessage.created_at)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

function Conversation({
  myId,
  otherId,
  onBack,
}: {
  myId: string;
  otherId: string;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [showWallpapers, setShowWallpapers] = useState(false);
  const [preview, setPreview] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const firstScroll = useRef(true);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [viewOnce, setViewOnce] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [viewer, setViewer] = useState<{ url: string; type: string } | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // Messages reçus en direct (presque instantané), en plus de la vérification régulière
  useEffect(() => {
    const channel = supabase
      .channel(`dm-${myId}-${otherId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${myId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["messages", myId, otherId] });
          qc.invalidateQueries({ queryKey: ["conversations", myId] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [myId, otherId, qc]);

  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const viewsKey = ["message-views", myId];
  const { data: openedIds = [] } = useQuery({
    queryKey: viewsKey,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data } = await supabase.from("message_views").select("message_id").eq("user_id", myId);
      return (data ?? []).map((v: any) => String(v.message_id));
    },
  });
  const opened = new Set(openedIds);

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    setShowAttach(false);
    if (!f) return;
    if (!(await checkPickedFile(f))) return;
    setFile(f);
    setFilePreview(URL.createObjectURL(f));
    setViewOnce(false);
  };

  const clearFile = () => {
    setFile(null);
    setFilePreview(null);
    setViewOnce(false);
  };

  const openViewOnce = async (m: any) => {
    try {
      const r = await callApi<{ url: string }>("dm-media-url", { message_id: m.id });
      setViewer({ url: r.url, type: m.media_type });
    } catch (e: any) {
      toast.error(e?.message ?? "Impossible d'ouvrir ce média");
    } finally {
      qc.invalidateQueries({ queryKey: viewsKey });
    }
  };

  // Une seule ligne par paire de personnes : on trie les deux identifiants (même ordre que dans la base).
  const [userA, userB] = [myId, otherId].sort();

  const { data: otherProfile } = useQuery({
    queryKey: ["profile", otherId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", otherId)
        .maybeSingle();
      return data;
    },
  });

  const handle = otherProfile?.display_name ?? otherProfile?.username ?? "Membre";

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", myId, otherId],
    refetchInterval: 10000,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${myId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${myId})`
        )
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  // Fond d'écran de la discussion (fond actif + éventuelle proposition en attente)
  const wallpaperKey = ["chat-wallpaper", userA, userB];
  const { data: wp } = useQuery({
    queryKey: wallpaperKey,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_wallpapers")
        .select("*")
        .eq("user_a", userA)
        .eq("user_b", userB)
        .maybeSingle();
      return data;
    },
  });

  const activeKey = wp?.wallpaper && WALLPAPERS[wp.wallpaper] ? wp.wallpaper : "default";
  const pendingKey = wp?.proposed_wallpaper && WALLPAPERS[wp.proposed_wallpaper] ? wp.proposed_wallpaper : null;
  const proposedByMe = wp?.proposed_by === myId;
  const incoming = !!pendingKey && !proposedByMe;
  const shownKey = preview && incoming ? (pendingKey as string) : activeKey;

  useEffect(() => {
    setPreview(false);
  }, [pendingKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: firstScroll.current ? "auto" : "smooth" });
    if (messages.length > 0) firstScroll.current = false;
  }, [messages]);

  const send = useMutation({
    mutationFn: async () => {
      const caption = text.trim();
      if (!caption && !file) return;
      let mediaPath: string | null = null;
      let mediaType: "image" | "video" | null = null;

      if (file) {
        const { blob, ext, isVideo } = await prepareUpload(file);
        const path = `${myId}/${otherId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("chat-media")
          .upload(path, blob, { contentType: blob.type || file.type || undefined, upsert: false });
        if (uploadError) throw uploadError;
        mediaPath = path;
        mediaType = isVideo ? "video" : "image";
      }

      const { error } = await supabase.from("messages").insert({
        sender_id: myId,
        receiver_id: otherId,
        content: caption || null,
        media_path: mediaPath,
        media_type: mediaType,
        view_once: !!mediaPath && viewOnce,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      clearFile();
      qc.invalidateQueries({ queryKey: ["messages", myId, otherId] });
      qc.invalidateQueries({ queryKey: ["conversations", myId] });
    },
    onError: (e: any) => toast.error(friendlyUploadError(e)),
  });

  const propose = useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase.rpc("propose_wallpaper", { p_other: otherId, p_wallpaper: key });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Proposition envoyée à ${handle}. Le fond changera s'il accepte.`);
      setShowWallpapers(false);
      qc.invalidateQueries({ queryKey: wallpaperKey });
    },
    onError: (e: any) => toast.error(e?.message ?? "Impossible de proposer ce fond"),
  });

  const answer = useMutation({
    mutationFn: async (accept: boolean) => {
      const { error } = await supabase.rpc("answer_wallpaper", { p_other: otherId, p_accept: accept });
      if (error) throw error;
      return accept;
    },
    onSuccess: (accept) => {
      if (incoming) toast.success(accept ? "Nouveau fond activé 🎨" : "Proposition refusée");
      qc.invalidateQueries({ queryKey: wallpaperKey });
    },
    onError: (e: any) => toast.error(e?.message ?? "Action impossible"),
  });

  return (
    <div className="h-[100dvh] bg-background flex flex-col">
      {/* En-tête */}
      <header className="shrink-0 border-b border-white/5 bg-background/90 backdrop-blur-md pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 px-3">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <button
            onClick={onBack}
            aria-label="Retour"
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center transition flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Link
            to="/u/$username"
            params={{ username: otherProfile?.username ?? otherId }}
            className="flex items-center gap-3 flex-1 min-w-0 rounded-xl px-1.5 py-1 hover:bg-white/5 transition"
          >
            <Avatar profile={otherProfile} size={40} />
            <div className="min-w-0">
              <p className="font-bold text-sm truncate leading-tight">{handle}</p>
              {otherProfile?.username && (
                <p className="text-xs text-muted-foreground truncate leading-tight">@{otherProfile.username}</p>
              )}
            </div>
          </Link>
          <button
            onClick={() => setShowWallpapers(true)}
            aria-label="Fond d'écran de la discussion"
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center transition flex-shrink-0"
          >
            <Palette className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Zone de messages avec fond d'écran */}
      <div
        className="flex-1 min-h-0 relative"
        style={{ backgroundImage: WALLPAPERS[shownKey].css }}
      >
        {incoming && (
          <div className="absolute top-3 inset-x-3 z-10">
            <div className="max-w-2xl mx-auto flex items-center gap-3 rounded-2xl bg-[#12151c]/95 border border-white/10 backdrop-blur p-3 shadow-lg">
              <button
                onClick={() => setPreview((p) => !p)}
                className="w-10 h-12 rounded-lg border border-white/10 bg-background flex-shrink-0 flex items-end justify-center pb-0.5"
                style={{ backgroundImage: WALLPAPERS[pendingKey as string].css }}
                aria-label="Aperçu du fond"
              >
                <span className="text-[9px] font-semibold bg-black/60 rounded px-1">
                  {preview ? "Retour" : "Aperçu"}
                </span>
              </button>
              <p className="flex-1 text-sm leading-tight">
                <span className="font-semibold">{handle}</span> propose le fond «&nbsp;
                {WALLPAPERS[pendingKey as string].label}&nbsp;»
              </p>
              <button
                onClick={() => answer.mutate(false)}
                disabled={answer.isPending}
                className="px-3 py-2 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 transition disabled:opacity-50"
              >
                Refuser
              </button>
              <button
                onClick={() => answer.mutate(true)}
                disabled={answer.isPending}
                className="px-3 py-2 rounded-full text-xs font-semibold bg-primary text-primary-foreground transition disabled:opacity-50"
              >
                Accepter
              </button>
            </div>
          </div>
        )}

        {!!pendingKey && proposedByMe && (
          <div className="absolute top-3 inset-x-3 z-10">
            <div className="max-w-2xl mx-auto flex items-center gap-3 rounded-2xl bg-[#12151c]/95 border border-white/10 backdrop-blur px-4 py-2.5 shadow-lg">
              <p className="flex-1 text-xs text-muted-foreground">
                En attente de la réponse de {handle} pour le fond «&nbsp;{WALLPAPERS[pendingKey].label}&nbsp;»
              </p>
              <button
                onClick={() => answer.mutate(false)}
                disabled={answer.isPending}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 transition disabled:opacity-50"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        <div className={`h-full overflow-y-auto px-3 pb-4 ${pendingKey ? "pt-20" : "pt-4"}`}>
          <div className="max-w-2xl mx-auto">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-16">
                Dis bonjour à {handle} 👋
              </p>
            )}
            {messages.map((msg: any, i: number) => {
              const isMine = msg.sender_id === myId;
              const prev = messages[i - 1];
              const showDay = !prev || dayLabel(prev.created_at) !== dayLabel(msg.created_at);
              const grouped = !!prev && prev.sender_id === msg.sender_id && !showDay;
              return (
                <div key={msg.id}>
                  {showDay && (
                    <div className="flex justify-center my-4">
                      <span className="text-[11px] font-semibold text-muted-foreground bg-black/40 backdrop-blur rounded-full px-3 py-1 capitalize">
                        {dayLabel(msg.created_at)}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isMine ? "justify-end" : "justify-start"} ${grouped ? "mt-0.5" : "mt-2"}`}>
                    <div className={`max-w-[78%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                      {msg.media_path && (
                        <div className="mb-1">
                          {msg.view_once ? (
                            <ViewOnceTile
                              mine={isMine}
                              opened={opened.has(String(msg.id))}
                              type={msg.media_type}
                              onOpen={() => openViewOnce(msg)}
                            />
                          ) : (
                            <NormalMedia action="dm-media-url" messageId={String(msg.id)} type={msg.media_type} />
                          )}
                        </div>
                      )}
                      {msg.content ? (
                        <div
                          className={`px-3.5 py-2 rounded-2xl text-[15px] leading-snug shadow-sm break-words ${
                            isMine
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-[#1a1d24] border border-white/5 text-foreground rounded-bl-md"
                          }`}
                        >
                          <span className="whitespace-pre-wrap">{msg.content}</span>
                          <span
                            className={`ml-2 text-[10px] align-bottom whitespace-nowrap ${
                              isMine ? "text-white/60" : "text-muted-foreground"
                            }`}
                          >
                            {timeLabel(msg.created_at)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground mx-1">{timeLabel(msg.created_at)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </div>
      </div>

      {/* Zone de saisie */}
      <div className="shrink-0 border-t border-white/5 bg-background/90 backdrop-blur-md px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-2xl mx-auto">
          {file && filePreview && (
            <div className="flex items-center gap-3 mb-3 p-2.5 rounded-2xl bg-white/5 border border-white/10">
              {file.type.startsWith("video/") ? (
                <video src={filePreview} muted className="w-14 h-14 rounded-xl object-cover bg-black" />
              ) : (
                <img src={filePreview} alt="" className="w-14 h-14 rounded-xl object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{file.type.startsWith("video/") ? "Vidéo prête" : "Photo prête"}</p>
                <div className="flex gap-2 mt-1.5">
                  <button
                    onClick={() => setViewOnce(false)}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition ${
                      !viewOnce ? "bg-primary/20 border-primary/40 text-primary" : "bg-white/5 border-white/10 text-muted-foreground"
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    onClick={() => setViewOnce(true)}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition flex items-center gap-1 ${
                      viewOnce ? "bg-primary/20 border-primary/40 text-primary" : "bg-white/5 border-white/10 text-muted-foreground"
                    }`}
                  >
                    <Timer className="w-3 h-3" /> Vue unique
                  </button>
                </div>
              </div>
              <button onClick={clearFile} aria-label="Retirer" className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {showAttach && (
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => galleryRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition"
              >
                <ImageIcon className="w-4 h-4" /> Galerie
              </button>
              <button
                onClick={() => cameraRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition"
              >
                <Camera className="w-4 h-4" /> Appareil photo
              </button>
            </div>
          )}

          <input ref={galleryRef} type="file" accept="image/*,video/*" className="hidden" onChange={pickFile} />
          <input ref={cameraRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={pickFile} />

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAttach((v) => !v)}
              aria-label="Ajouter une photo ou une vidéo"
              className={`w-11 h-11 rounded-full flex items-center justify-center transition flex-shrink-0 ${
                showAttach ? "bg-primary text-primary-foreground" : "bg-white/5 hover:bg-white/10"
              }`}
            >
              <Plus className={`w-5 h-5 transition ${showAttach ? "rotate-45" : ""}`} />
            </button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !send.isPending && send.mutate()}
              placeholder={file ? "Ajouter une légende..." : "Écrire un message..."}
              enterKeyHint="send"
              maxLength={2000}
              className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-3 text-[16px] focus:outline-none focus:border-primary"
            />
            <button
              onClick={() => send.mutate()}
              disabled={(!text.trim() && !file) || send.isPending}
              aria-label="Envoyer"
              className="w-11 h-11 bg-primary rounded-full flex items-center justify-center disabled:opacity-40 active:scale-95 transition flex-shrink-0"
            >
              {send.isPending ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      <ViewOnceViewer viewer={viewer} onClose={() => setViewer(null)} />

      {/* Choix du fond d'écran */}
      {showWallpapers && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
          <button
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowWallpapers(false)}
            aria-label="Fermer"
          />
          <div className="relative w-full max-w-md bg-[#101319] border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold">Fond d'écran</h2>
              <button
                onClick={() => setShowWallpapers(false)}
                aria-label="Fermer"
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Le fond change pour vous deux, seulement si {handle} accepte ta proposition.
            </p>
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(WALLPAPERS).map(([key, w]) => {
                const isActive = key === activeKey;
                const isPending = key === pendingKey && proposedByMe;
                return (
                  <button
                    key={key}
                    onClick={() => !isActive && propose.mutate(key)}
                    disabled={propose.isPending}
                    className="flex flex-col items-center gap-1.5 group disabled:opacity-60"
                  >
                    <div
                      className={`relative w-full aspect-[3/4] rounded-xl border bg-background overflow-hidden flex items-center justify-center ${
                        isActive ? "border-primary" : "border-white/10 group-hover:border-white/30"
                      }`}
                      style={{ backgroundImage: w.css }}
                    >
                      {isActive && (
                        <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </span>
                      )}
                      {isPending && (
                        <span className="text-[9px] font-semibold bg-black/70 rounded px-1">En attente</span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition">
                      {w.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
