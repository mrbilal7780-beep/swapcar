import { createFileRoute } from "@tanstack/react-router";
import heroCar from "@/assets/hero-car.jpg";
import carBmw from "@/assets/car-bmw.jpg";
import carAudi from "@/assets/car-audi.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SwapCars AI — Échangez votre voiture avec l'intelligence artificielle" },
      { name: "description", content: "La plateforme premium d'échange automobile. L'IA analyse votre voiture, estime sa valeur et trouve les meilleurs échanges." },
      { property: "og:title", content: "SwapCars AI — Le futur de l'échange automobile" },
      { property: "og:description", content: "Photo, analyse IA, estimation, matching. Trouvez votre prochain véhicule sans vendre le vôtre." },
      { property: "og:image", content: heroCar },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <Matching />
      <Analysis />
      <Photos />
      <CTA />
      <Footer />
    </div>
  );
}

function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 glow" />
          <span className="text-lg font-bold tracking-tight">SWAPCARS <span className="text-gradient">AI</span></span>
        </div>
        <div className="hidden md:flex gap-8 text-sm text-muted-foreground">
          <a href="#matching" className="hover:text-foreground transition">Explorer</a>
          <a href="#analysis" className="hover:text-foreground transition">Comment ça marche</a>
          <a href="#analysis" className="hover:text-foreground transition">Estimation IA</a>
          <a href="#matching" className="hover:text-foreground transition">Échanges</a>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold transition glow">
          Déposer ma voiture
        </button>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <img
        src={heroCar}
        alt="Voiture premium analysée par SwapCars AI"
        width={1920}
        height={1280}
        className="absolute inset-0 w-full h-full object-cover opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />

      <div className="relative max-w-7xl mx-auto px-6 md:px-8 py-32 w-full">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full text-xs text-primary mb-8">
            <span className="w-2 h-2 rounded-full bg-primary glow" />
            Intelligence Automobile Nouvelle Génération
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tight">
            Trouvez votre<br />
            prochain véhicule<br />
            <span className="text-gradient">sans vendre</span><br />
            le vôtre.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mt-8 max-w-xl leading-relaxed">
            Prenez quelques photos. L'IA analyse votre voiture, estime sa valeur et trouve automatiquement les meilleurs échanges disponibles.
          </p>
          <div className="flex flex-wrap gap-4 mt-10">
            <button className="bg-foreground text-background hover:bg-foreground/90 px-8 py-4 rounded-full font-semibold transition">
              Déposer ma voiture
            </button>
            <button className="glass hover:bg-white/10 px-8 py-4 rounded-full font-semibold transition">
              Voir les échanges
            </button>
          </div>
          <div className="flex flex-wrap gap-10 md:gap-16 mt-20">
            <Stat value="12K+" label="Véhicules analysés" />
            <Stat value="96%" label="Précision IA" />
            <Stat value="5min" label="Analyse moyenne" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-3xl md:text-4xl font-bold tracking-tight">{value}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function Matching() {
  return (
    <section id="matching" className="py-32 px-6 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <div className="text-xs uppercase tracking-widest text-primary mb-4">Matching IA</div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            Deux voitures.<br />Un échange parfait.
          </h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-center">
          <CarCard image={carBmw} name="BMW M340i" meta="2021 • 72 000 km" price="28 500 €" />

          <div className="text-center order-first lg:order-none">
            <div className="text-7xl md:text-8xl font-black text-gradient leading-none">96%</div>
            <div className="text-base mt-3 text-muted-foreground">Compatibilité IA</div>
            <div className="mt-8 glass rounded-2xl p-6 text-left space-y-3 text-sm">
              {["Valeur similaire", "Même catégorie", "Distance faible", "Profil compatible"].map((t) => (
                <div key={t} className="flex items-center gap-3">
                  <span className="text-primary">✓</span>
                  <span className="text-muted-foreground">{t}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Compensation</span>
                <span className="font-semibold">+ 1 250 €</span>
              </div>
            </div>
          </div>

          <CarCard image={carAudi} name="Audi S4" meta="2020 • 65 000 km" price="27 250 €" />
        </div>
      </div>
    </section>
  );
}

function CarCard({ image, name, meta, price }: { image: string; name: string; meta: string; price: string }) {
  return (
    <div className="glass rounded-3xl overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
      <div className="aspect-[16/10] overflow-hidden">
        <img
          src={image}
          alt={name}
          width={1024}
          height={640}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold">{name}</h3>
        <p className="text-sm text-muted-foreground mt-1">{meta}</p>
        <p className="mt-5 text-2xl font-bold tracking-tight">{price}</p>
      </div>
    </div>
  );
}

function Analysis() {
  const items = [
    { icon: "🚘", label: "Carrosserie", score: "94", highlight: true },
    { icon: "🛋️", label: "Intérieur", score: "91" },
    { icon: "⚙️", label: "Mécanique", score: "89" },
    { icon: "💰", label: "Valeur IA", score: "28 500€", isValue: true },
  ];
  return (
    <section id="analysis" className="py-32 px-6 md:px-8 bg-card/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <div className="text-xs uppercase tracking-widest text-primary mb-4">Analyse IA</div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            Chaque détail. Analysé.
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((it) => (
            <div key={it.label} className={`glass rounded-3xl p-8 ${it.highlight ? "glow" : ""}`}>
              <div className="text-4xl mb-6">{it.icon}</div>
              <h3 className="font-semibold text-base text-muted-foreground">{it.label}</h3>
              <div className={`${it.isValue ? "text-3xl" : "text-5xl"} font-black mt-3 ${it.highlight ? "text-gradient" : ""}`}>
                {it.score}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Photos() {
  const steps = ["Avant", "Arrière", "Profil", "Intérieur", "Moteur"];
  return (
    <section className="py-32 px-6 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <div className="text-xs uppercase tracking-widest text-primary mb-4">Photos guidées</div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            5 minutes. 10 photos. Une analyse complète.
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {steps.map((s, i) => (
            <div key={s} className="glass rounded-2xl p-6 text-center aspect-square flex flex-col items-center justify-center">
              <div className="text-3xl mb-3">📸</div>
              <div className="text-xs text-muted-foreground">Étape {i + 1}</div>
              <div className="font-semibold mt-1">{s}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-32 px-6 md:px-8">
      <div className="max-w-4xl mx-auto text-center glass rounded-[2rem] p-12 md:p-20 relative overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <h2 className="relative text-4xl md:text-6xl font-black tracking-tight">
          Prêt à trouver votre<br />
          <span className="text-gradient">prochain véhicule ?</span>
        </h2>
        <p className="relative text-muted-foreground text-lg mt-6">
          Laissez l'intelligence artificielle faire le travail.
        </p>
        <button className="relative mt-10 bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-4 rounded-full text-base font-semibold transition glow">
          Commencer maintenant
        </button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 py-10 px-6 md:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
        <div className="font-semibold tracking-tight">SWAPCARS <span className="text-gradient">AI</span> © 2026</div>
        <div className="text-muted-foreground">Le futur de l'échange automobile.</div>
      </div>
    </footer>
  );
}
