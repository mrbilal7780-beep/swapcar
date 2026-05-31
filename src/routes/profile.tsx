import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/Header";
import { CARS } from "@/data/cars";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Mon profil — SwapCars AI" },
      { name: "description", content: "Gérez votre profil, vos véhicules et votre score de confiance." },
      { property: "og:title", content: "Mon profil — SwapCars AI" },
      { property: "og:description", content: "Votre tableau de bord SwapCars AI." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const myCars = CARS.slice(0, 1);
  return (
    <PageShell>
      <section className="max-w-5xl mx-auto px-6 md:px-8 py-8">
        <div className="glass rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-center md:items-end gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/40 glow flex items-center justify-center text-3xl font-black">AM</div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-black tracking-tight">Alexandre Martin</h1>
            <p className="text-muted-foreground mt-1">Paris, France · Membre depuis 2024</p>
            <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
              <Badge>✓ Email</Badge>
              <Badge>✓ Téléphone</Badge>
              <Badge>✓ Identité</Badge>
              <Badge>★ Top 5%</Badge>
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Score de confiance</div>
            <div className="text-5xl font-black text-gradient mt-1">92</div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <Stat label="Échanges réalisés" v="3" />
          <Stat label="Note moyenne" v="4.9 ★" />
          <Stat label="Matches actifs" v="12" />
        </div>

        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Mes véhicules</h2>
            <Link to="/add-vehicle" className="text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-full font-semibold glow">
              + Ajouter
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {myCars.map((c) => (
              <Link key={c.id} to="/vehicle/$id" params={{ id: c.id }} className="glass rounded-3xl overflow-hidden hover:scale-[1.02] transition-transform">
                <img src={c.image} alt={c.brand} width={1024} height={640} className="w-full aspect-[16/10] object-cover" />
                <div className="p-5">
                  <div className="font-bold">{c.brand} {c.model}</div>
                  <div className="text-sm text-muted-foreground mt-1">{c.year} • {c.price.toLocaleString("fr-FR")} €</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="text-xs glass px-3 py-1 rounded-full text-primary">{children}</span>;
}
function Stat({ label, v }: { label: string; v: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-2">{v}</div>
    </div>
  );
}