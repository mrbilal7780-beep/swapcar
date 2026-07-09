import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { PageShell } from "@/components/layout/Header";
import { Send, ArrowLeft } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Messages — TORQUE" }] }),
  component: () => <RequireAuth><ChatPage /></RequireAuth>,
});

function ChatPage() {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Liste des conversations (personnes avec qui on a échangé)
  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    refetchInterval: 10000,
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
        onBack={() => setSelectedUserId(null)}
      />
    );
  }

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">
        <div className="px-4 py-3 border-b border-white/5">
          <h1 className="text-lg font-bold">Messages</h1>
        </div>

        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-8 text-center gap-3">
            <p className="text-lg font-bold">Aucun message</p>
            <p className="text-sm text-muted-foreground">
              Abonne-toi à des membres pour leur envoyer des messages
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
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {(conv.profile?.display_name ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {conv.profile?.display_name ?? conv.profile?.username ?? "Membre"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {conv.lastMessage.content}
                  </p>
                </div>
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
  const bottomRef = useRef<HTMLDivElement>(null);

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

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", myId, otherId],
    refetchInterval: 3000,
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useMutation({
    mutationFn: async () => {
      if (!text.trim()) return;
      const { error } = await supabase.from("messages").insert({
        sender_id: myId,
        receiver_id: otherId,
        content: text.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["messages", myId, otherId] });
      qc.invalidateQueries({ queryKey: ["conversations", myId] });
    },
  });

  const handle = otherProfile?.display_name ?? otherProfile?.username ?? "Membre";

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/5 rounded-lg transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center font-bold text-sm">
          {handle.slice(0, 2).toUpperCase()}
        </div>
        <span className="font-bold">{handle}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-2xl mx-auto w-full">
        {messages.map((msg: any) => {
          const isMine = msg.sender_id === myId;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  isMine
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-white/10 text-foreground rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="fixed bottom-16 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-white/5 px-4 py-3">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send.mutate()}
            placeholder="Écrire un message..."
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
          <button
            onClick={() => send.mutate()}
            disabled={!text.trim() || send.isPending}
            className="w-10 h-10 bg-primary rounded-full flex items-center justify-center disabled:opacity-40 transition"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}