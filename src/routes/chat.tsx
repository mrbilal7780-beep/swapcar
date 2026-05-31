import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/layout/Header";
import { CARS } from "@/data/cars";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Messages — SwapCars AI" },
      { name: "description", content: "Négociez vos échanges en temps réel avec l'assistant IA." },
      { property: "og:title", content: "Messages — SwapCars AI" },
      { property: "og:description", content: "Discutez. Négociez. Échangez." },
    ],
  }),
  component: Chat,
});

type Msg = { from: "me" | "them" | "ai"; text: string };

function Chat() {
  const conversations = CARS.slice(1, 5);
  const [active, setActive] = useState(conversations[0]);
  const [messages, setMessages] = useState<Msg[]>([
    { from: "them", text: "Bonjour, votre BMW M340i m'intéresse beaucoup !" },
    { from: "me", text: "Salut, votre Audi S4 a l'air en super état également." },
    { from: "ai", text: "💡 Analyse IA : compatibilité 96%. Compensation suggérée : +1 250 € de votre côté." },
  ]);
  const [input, setInput] = useState("");

  function send() {
    if (!input.trim()) return;
    setMessages((m) => [...m, { from: "me", text: input }]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [...m, { from: "them", text: "Très bien, on peut organiser un essai cette semaine ?" }]);
    }, 800);
  }

  return (
    <PageShell>
      <section className="max-w-6xl mx-auto px-6 md:px-8 py-8">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-8">
          <span className="text-gradient">Messages</span>
        </h1>

        <div className="grid md:grid-cols-[280px_1fr] gap-6 glass rounded-3xl overflow-hidden min-h-[600px]">
          {/* Sidebar */}
          <aside className="border-r border-white/10 p-3 space-y-2">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActive(c)}
                className={`w-full flex gap-3 p-3 rounded-2xl text-left transition ${active.id === c.id ? "bg-primary/10" : "hover:bg-white/5"}`}
              >
                <img src={c.image} alt={c.brand} width={1024} height={640} loading="lazy" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{c.owner}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.brand} {c.model}</div>
                </div>
              </button>
            ))}
          </aside>

          {/* Chat */}
          <div className="flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              <img src={active.image} alt={active.brand} width={1024} height={640} className="w-10 h-10 rounded-xl object-cover" />
              <div>
                <div className="font-semibold">{active.owner}</div>
                <div className="text-xs text-muted-foreground">{active.brand} {active.model} • {active.city}</div>
              </div>
            </div>

            <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[500px]">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm ${
                    m.from === "me" ? "bg-primary text-primary-foreground rounded-br-sm" :
                    m.from === "ai" ? "glass border border-primary/30 text-primary" :
                    "bg-secondary rounded-bl-sm"
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-white/10 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Votre message..."
                className="input flex-1"
              />
              <button onClick={send} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 rounded-xl font-semibold glow">
                Envoyer
              </button>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}