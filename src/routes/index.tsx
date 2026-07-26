import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { Film, Car, MapPin, MessageCircle, ArrowRight } from "lucide-react";
import { VideoBackground } from "@/components/VideoBackground";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TORQUE — Le réseau social automobile premium" },
      {
        name: "description",
        content:
          "TORQUE : partage ton garage, tes sorties et tes reels avec la communauté automobile. Rejoins-la aujourd'hui.",
      },
    ],
  }),
  component: Index,
});

const FEATURES = [
  {
    icon: Film,
    title: "Reels vidéo",
    text: "Un flux vertical dédié à la vidéo, qui met en avant les comptes que tu suis et l'engagement de la communauté.",
  },
  {
    icon: Car,
    title: "Garage showroom",
    text: "Présente tes véhicules dans une fiche interactive en relief — chaque photo réagit au toucher comme dans un vrai showroom.",
  },
  {
    icon: MapPin,
    title: "Rassemblements",
    text: "Trouve les meetings, sorties et expositions près de chez toi, et retrouve qui y participe avec quel véhicule.",
  },
  {
    icon: MessageCircle,
    title: "Messagerie",
    text: "Discute directement avec n'importe quel membre de la communauté, sans détour.",
  },
];

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Le contenu de la vitrine est toujours rendu (y compris cote serveur, pour
  // le SEO et les apercus de lien) - un utilisateur deja connecte est
  // redirige des que la session est confirmee, sans passer par un ecran de
  // chargement qui viderait le HTML SSR de son contenu.
  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/feed" });
    }
  }, [user, loading, navigate]);

  return (
    <div className="bg-background text-foreground">
      <style>{`html { padding-top: max(0px, env(safe-area-inset-top)); padding-bottom: max(0px, env(safe-area-inset-bottom)); padding-left: max(0px, env(safe-area-inset-left)); padding-right: max(0px, env(safe-area-inset-right)); }`}</style>

      {/* Hero */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <VideoBackground opacity={0.5} />

        <div className="relative z-10 max-w-lg">
          <div className="racing-stripes inline-block py-2">
            <div className="glow-pulse inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 mb-6">
              <span className="text-4xl font-black">T</span>
            </div>
          </div>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-gradient">TORQUE</h1>
          <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">
            Le réseau social automobile premium. Ton garage, tes sorties,
            tes reels — une seule communauté, celle qui vit pour la voiture.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:shadow-lg hover:shadow-primary/40 transition active:scale-95 duration-150"
            >
              Rejoindre la communauté
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white/5 border border-white/15 backdrop-blur-sm font-bold text-sm hover:bg-white/10 transition active:scale-95 duration-150"
            >
              J'ai déjà un compte
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 w-5 h-8 rounded-full border-2 border-white/30 flex items-start justify-center p-1">
          <div className="w-1 h-1.5 rounded-full bg-white/70 animate-bounce" />
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Ce que tu trouves ici</p>
          <h2 className="text-3xl sm:text-4xl font-black">Fait pour les passionnés</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="group relative rounded-2xl bg-white/[0.03] border border-white/10 p-6 hover:border-primary/40 transition overflow-hidden"
            >
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-primary/10 blur-2xl group-hover:bg-primary/20 transition" />
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="relative font-bold text-lg mb-1.5">{title}</h3>
              <p className="relative text-sm text-muted-foreground leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="racing-stripes relative px-6 py-24 text-center overflow-hidden">
        <h2 className="text-3xl sm:text-4xl font-black mb-4">
          Ta place t'attend dans le <span className="text-gradient">garage</span>
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Gratuit, sans engagement. Crée ton compte en moins d'une minute.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:shadow-lg hover:shadow-primary/40 transition active:scale-95 duration-150"
        >
          Créer mon compte
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-white/5 text-center">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} TORQUE — Réseau social automobile premium</p>
      </footer>
    </div>
  );
}
