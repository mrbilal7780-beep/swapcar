import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { Film, Car, MapPin, MessageCircle, ArrowRight, Download, Share, Apple, PlayCircle } from "lucide-react";
import { VideoBackground } from "@/components/VideoBackground";
import { usePwaInstall } from "@/hooks/use-pwa-install";

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

function DownloadSection() {
  const { canInstall, promptInstall, installed } = usePwaInstall();
  const [isIOS, setIsIOS] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window));
  }, []);

  if (installed) return null;

  const handleInstallClick = async () => {
    if (canInstall) {
      await promptInstall();
    } else if (isIOS) {
      setShowIosHelp((v) => !v);
    }
  };

  return (
    <section className="px-6 py-20 max-w-3xl mx-auto text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Emmène TORQUE partout</p>
      <h2 className="text-3xl sm:text-4xl font-black mb-4">Télécharge l'app</h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        Installe TORQUE sur ton téléphone en un instant — accès direct depuis
        ton écran d'accueil, plein écran, comme une vraie app native.
      </p>

      <button
        onClick={handleInstallClick}
        className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:shadow-lg hover:shadow-primary/40 transition active:scale-95 duration-150"
      >
        <Download className="w-4 h-4" />
        Installer l'app
      </button>

      {showIosHelp && (
        <div className="mt-6 mx-auto max-w-sm rounded-2xl bg-white/[0.03] border border-white/10 p-5 text-sm text-left">
          <p className="font-bold mb-2">Sur iPhone / iPad (Safari) :</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li className="flex items-center gap-1.5 flex-wrap">
              Appuie sur l'icône de partage <Share className="w-3.5 h-3.5 shrink-0" /> en bas de l'écran
            </li>
            <li>Choisis « Sur l'écran d'accueil »</li>
            <li>Confirme — TORQUE apparaît comme une vraie app</li>
          </ol>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
        <StoreBadge icon={Apple} label="App Store" />
        <StoreBadge icon={PlayCircle} label="Google Play" />
      </div>
      <p className="text-xs text-muted-foreground/70 mt-3">Bientôt disponibles</p>
    </section>
  );
}

function StoreBadge({ icon: Icon, label }: { icon: typeof Apple; label: string }) {
  return (
    <div
      aria-disabled="true"
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-muted-foreground/60 cursor-not-allowed select-none"
    >
      <Icon className="w-5 h-5" />
      <div className="text-left leading-tight">
        <p className="text-[10px] uppercase tracking-wide">Bientôt sur</p>
        <p className="text-sm font-bold">{label}</p>
      </div>
    </div>
  );
}

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

      {/* Téléchargement */}
      <DownloadSection />

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
