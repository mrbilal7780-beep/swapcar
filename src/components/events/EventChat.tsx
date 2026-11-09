import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, Eye, EyeOff, Image as ImageIcon, Plus, Send, Timer, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image";
import { callApi } from "@/lib/push";

const MAX_VIDEO_SECONDS = 45;
const MAX_FILE_MB = 30;

function dayLabel(iso: string) {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(new Date()) - start(d)) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  return d.toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
}

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

function Avatar({ profile, size = 28 }: { profile: any; size?: number }) {
  const label = (profile?.display_name ?? profile?.username ?? "?").slice(0, 2).toUpperCase();
  return profile?.avatar_url ? (
    <img src={profile.avatar_url} alt="" style={{ width: size, height: size }} className="rounded-full object-cover flex-shrink-0" />
  ) : (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center font-bold text-[10px] flex-shrink-0"
    >
      {label}
    </div>
  );
}

// Média d'un message : lien temporaire demandé au serveur (jamais d'adresse publique)
function NormalMedia({ message }: { message: any }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["event-media", message.id],
    staleTime: 50 * 60 * 1000,
    retry: false,
    queryFn: () => callApi<{ url: string }>("media-url", { message_id: message.id }),
  });
  if (isLoading) return <div className="w-56 h-56 rounded-xl bg-white/5 animate-pulse" />;
  if (isError || !data?.url) {
    return (
      <div className="w-56 h-24 rounded-xl bg-white/5 flex items-center justify-center text-xs text-muted-foreground">
        Média indisponible
      </div>
    );
  }
  return message.media_type === "video" ? (
    <video src={data.url} controls playsInline preload="metadata" className="max-w-[230px] max-h-72 rounded-xl bg-black" />
  ) : (
    <img src={data.url} alt="" className="max-w-[230px] max-h-72 rounded-xl object-cover" />
  );
}

export function EventChat({
  eventId,
  title,
  closesAt,
  myId,
  onBack,
}: {
  eventId: string;
  title: string;
  closesAt: number;
  myId: string;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [viewOnce, setViewOnce] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [viewer, setViewer] = useState<{ url: string; type: string; id: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const firstScroll = useRef(true);

  const closed = now >= closesAt;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const messagesKey = ["event-messages", eventId];
  const { data: messages = [] } = useQuery({
    queryKey: messagesKey,
    refetchInterval: 3000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_messages")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  const senderIds = [...new Set(messages.map((m: any) => m.sender_id))].sort();
  const { data: profiles = [] } = useQuery({
    queryKey: ["event-chat-profiles", senderIds.join(",")],
    enabled: senderIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", senderIds);
      return data ?? [];
    },
  });
  const profileOf = new Map<string, any>(profiles.map((p: any) => [p.user_id, p]));

  const viewsKey = ["event-views", eventId, myId];
  const { data: openedIds = [] } = useQuery({
    queryKey: viewsKey,
    refetchInterval: 6000,
    queryFn: async () => {
      const { data } = await supabase.from("event_message_views").select("message_id").eq("user_id", myId);
      return (data ?? []).map((v: any) => v.message_id as string);
    },
  });
  const opened = new Set(openedIds);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: firstScroll.current ? "auto" : "smooth" });
    if (messages.length > 0) firstScroll.current = false;
  }, [messages.length]);

  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    setShowAttach(false);
    if (!f) return;
    if (f.size > MAX_FILE_MB * 1024 * 1024 && f.type.startsWith("video/")) {
      toast.error(`Vidéo trop lourde (${MAX_FILE_MB} Mo maximum).`);
      return;
    }
    if (f.type.startsWith("video/")) {
      const d = await videoDuration(f);
      if (Number.isFinite(d) && d > MAX_VIDEO_SECONDS) {
        toast.error(`Vidéo trop longue (${MAX_VIDEO_SECONDS} secondes maximum).`);
        return;
      }
    }
    setFile(f);
    setFilePreview(URL.createObjectURL(f));
    setViewOnce(false);
  };

  const clearFile = () => {
    setFile(null);
    setFilePreview(null);
    setViewOnce(false);
  };

  const send = useMutation({
    mutationFn: async () => {
      const caption = text.trim();
      if (!caption && !file) return;
      let mediaPath: string | null = null;
      let mediaType: "image" | "video" | null = null;

      if (file) {
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
        const path = `${eventId}/${myId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("event-chat")
          .upload(path, blob, { contentType: blob.type || file.type || undefined, upsert: false });
        if (uploadError) throw uploadError;
        mediaPath = path;
        mediaType = isVideo ? "video" : "image";
      }

      const { error } = await supabase.from("event_messages").insert({
        event_id: eventId,
        sender_id: myId,
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
      qc.invalidateQueries({ queryKey: messagesKey });
    },
    onError: (e: any) => {
      const msg = String(e?.message ?? "");
      if (/mime|type/i.test(msg) && /support|allow|invalid/i.test(msg)) {
        toast.error("Format non pris en charge : utilise une photo JPG/PNG ou une vidéo MP4.");
      } else {
        toast.error(msg || "Message non envoyé");
      }
    },
  });

  const openViewOnce = async (m: any) => {
    try {
      const r = await callApi<{ url: string }>("media-url", { message_id: m.id });
      setViewer({ url: r.url, type: m.media_type, id: m.id });
    } catch (e: any) {
      toast.error(e?.message ?? "Impossible d'ouvrir ce média");
    } finally {
      qc.invalidateQueries({ queryKey: viewsKey });
    }
  };

  // Ferme automatiquement la visionneuse « vue unique » (photo : 12 s, vidéo : à la fin ou 60 s)
  useEffect(() => {
    if (!viewer) return;
    const t = setTimeout(() => setViewer(null), viewer.type === "video" ? 60000 : 12000);
    return () => clearTimeout(t);
  }, [viewer]);

  const closesLabel = new Date(closesAt).toLocaleString("fr-BE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      <header className="shrink-0 border-b border-white/5 bg-background/90 backdrop-blur-md pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 px-3">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <button
            onClick={onBack}
            aria-label="Retour"
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center transition flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1 px-1">
            <p className="font-bold text-sm truncate leading-tight">{title}</p>
            <p className="text-xs text-muted-foreground truncate leading-tight">
              {closed ? "Discussion terminée" : `Discussion du rasso · se ferme le ${closesLabel}`}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="mx-auto max-w-sm text-center text-[11px] leading-snug text-muted-foreground bg-white/5 rounded-2xl px-4 py-2.5 mb-4">
            Les messages et les médias sont supprimés 24 h après la fin du rasso. Un média en « vue unique »
            ne peut être ouvert qu'une seule fois.
          </div>

          {messages.length === 0 && !closed && (
            <p className="text-center text-sm text-muted-foreground py-10">
              Personne n'a encore écrit. Pose une question, organise le covoiturage, partage tes photos.
            </p>
          )}

          {messages.map((m: any, i: number) => {
            const mine = m.sender_id === myId;
            const prev = messages[i - 1];
            const showDay = !prev || dayLabel(prev.created_at) !== dayLabel(m.created_at);
            const grouped = !!prev && prev.sender_id === m.sender_id && !showDay;
            const sender = profileOf.get(m.sender_id);
            const hasMedia = !!m.media_path;
            const isOpened = opened.has(m.id);
            return (
              <div key={m.id}>
                {showDay && (
                  <div className="flex justify-center my-4">
                    <span className="text-[11px] font-semibold text-muted-foreground bg-white/5 rounded-full px-3 py-1 capitalize">
                      {dayLabel(m.created_at)}
                    </span>
                  </div>
                )}
                <div className={`flex gap-2 ${mine ? "justify-end" : "justify-start"} ${grouped ? "mt-0.5" : "mt-3"}`}>
                  {!mine && (
                    <div className="w-7 flex-shrink-0 self-end"><Avatar profile={sender} /></div>
                  )}
                  <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                    {!mine && !grouped && (
                      <span className="text-[11px] text-muted-foreground mb-0.5 ml-1">
                        {sender?.display_name ?? sender?.username ?? "Membre"}
                      </span>
                    )}

                    {hasMedia && (
                      <div className="mb-1">
                        {m.view_once ? (
                          mine ? (
                            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl rounded-br-md bg-primary/20 border border-primary/30 text-sm">
                              <Timer className="w-4 h-4" />
                              {m.media_type === "video" ? "Vidéo" : "Photo"} à vue unique envoyée
                            </div>
                          ) : isOpened ? (
                            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-white/5 border border-white/10 text-sm text-muted-foreground">
                              <EyeOff className="w-4 h-4" /> Ouvert
                            </div>
                          ) : (
                            <button
                              onClick={() => openViewOnce(m)}
                              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-primary text-primary-foreground text-sm font-semibold active:scale-95 transition"
                            >
                              <Eye className="w-4 h-4" />
                              {m.media_type === "video" ? "Vidéo" : "Photo"} · touche pour voir (1 fois)
                            </button>
                          )
                        ) : (
                          <NormalMedia message={m} />
                        )}
                      </div>
                    )}

                    {m.content && (
                      <div
                        className={`px-3.5 py-2 rounded-2xl text-[15px] leading-snug shadow-sm break-words ${
                          mine
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-[#1a1d24] border border-white/5 rounded-bl-md"
                        }`}
                      >
                        <span className="whitespace-pre-wrap">{m.content}</span>
                        <span className={`ml-2 text-[10px] align-bottom ${mine ? "text-white/60" : "text-muted-foreground"}`}>
                          {timeLabel(m.created_at)}
                        </span>
                      </div>
                    )}
                    {!m.content && (
                      <span className="text-[10px] text-muted-foreground mx-1">{timeLabel(m.created_at)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Saisie */}
      {closed ? (
        <div className="shrink-0 border-t border-white/5 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-sm text-muted-foreground">
          Cette discussion est terminée : messages et médias ont été supprimés.
        </div>
      ) : (
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
                <button
                  onClick={clearFile}
                  aria-label="Retirer"
                  className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center flex-shrink-0"
                >
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
                onClick={() => setShowAttach((s) => !s)}
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
                placeholder={file ? "Ajouter une légende…" : "Écrire un message…"}
                enterKeyHint="send"
                maxLength={1000}
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
      )}

      {/* Visionneuse plein écran (vue unique) */}
      {viewer &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-black flex flex-col" onContextMenu={(e) => e.preventDefault()}>
            <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-white/80">
                <Timer className="w-4 h-4" /> Vue unique
              </span>
              <button
                onClick={() => setViewer(null)}
                aria-label="Fermer"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
              >
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
                  onEnded={() => setViewer(null)}
                  className="max-w-full max-h-full"
                />
              ) : (
                <img src={viewer.url} alt="" draggable={false} className="max-w-full max-h-full object-contain select-none" />
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
