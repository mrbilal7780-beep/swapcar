import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/layout/Header";
import { BRANDS } from "@/data/cars";

export const Route = createFileRoute("/add-vehicle")({
  head: () => ({
    meta: [
      { title: "Déposer mon véhicule — SwapCars AI" },
      { name: "description", content: "Ajoutez votre véhicule en 4 étapes guidées et laissez l'IA estimer sa valeur." },
      { property: "og:title", content: "Déposer mon véhicule — SwapCars AI" },
      { property: "og:description", content: "Photos guidées, analyse IA, estimation instantanée." },
    ],
  }),
  component: AddVehicle,
});

const PHOTO_STEPS = [
  "Face avant", "Face arrière", "Profil gauche", "Profil droit", "Tableau de bord",
  "Intérieur avant", "Intérieur arrière", "Compartiment moteur", "Jantes", "Compteur",
];

function AddVehicle() {
  const [step, setStep] = useState(0);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [generation, setGeneration] = useState("");
  const [year, setYear] = useState("");
  const [mileage, setMileage] = useState("");
  const [fuel, setFuel] = useState("Essence");
  const [photos, setPhotos] = useState<string[]>([]);

  const models = brand ? Object.keys(BRANDS[brand]?.models ?? {}) : [];
  const gens = brand && model ? BRANDS[brand]?.models[model] ?? [] : [];

  const steps = ["Véhicule", "Détails", "Photos", "Estimation IA"];

  return (
    <PageShell>
      <section className="max-w-3xl mx-auto px-6 md:px-8 py-8">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          Déposer <span className="text-gradient">mon véhicule</span>
        </h1>
        <p className="text-muted-foreground mt-2">L'IA analyse votre voiture en quelques minutes.</p>

        {/* Stepper */}
        <div className="flex items-center gap-2 mt-8 mb-10">
          {steps.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= step ? "bg-gradient-to-r from-primary to-primary/60" : "bg-white/10"}`} />
              <div className={`text-xs mt-2 ${i === step ? "text-foreground font-semibold" : "text-muted-foreground"}`}>{s}</div>
            </div>
          ))}
        </div>

        <div className="glass rounded-3xl p-6 md:p-8">
          {step === 0 && (
            <div className="space-y-4">
              <Field label="Marque">
                <select value={brand} onChange={(e) => { setBrand(e.target.value); setModel(""); setGeneration(""); }} className="input">
                  <option value="">Sélectionner...</option>
                  {Object.keys(BRANDS).map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>
              <Field label="Modèle">
                <select value={model} onChange={(e) => { setModel(e.target.value); setGeneration(""); }} disabled={!brand} className="input">
                  <option value="">Sélectionner...</option>
                  {models.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Génération">
                <select value={generation} onChange={(e) => setGeneration(e.target.value)} disabled={!model} className="input">
                  <option value="">Sélectionner...</option>
                  {gens.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Année"><input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2021" className="input" /></Field>
              <Field label="Kilométrage"><input type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="72000" className="input" /></Field>
              <Field label="Carburant">
                <select value={fuel} onChange={(e) => setFuel(e.target.value)} className="input">
                  {["Essence", "Diesel", "Hybride", "Électrique"].map((f) => <option key={f}>{f}</option>)}
                </select>
              </Field>
              <Field label="Transmission">
                <select className="input"><option>Automatique</option><option>Manuelle</option></select>
              </Field>
              <Field label="Couleur"><input className="input" placeholder="Bleu" /></Field>
              <Field label="Propriétaires"><input type="number" className="input" placeholder="1" /></Field>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-sm text-muted-foreground mb-6">Prenez les 10 photos guidées. L'IA analysera chaque cliché.</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {PHOTO_STEPS.map((p, i) => {
                  const done = photos.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => setPhotos((ps) => done ? ps.filter((x) => x !== p) : [...ps, p])}
                      className={`aspect-square rounded-2xl border ${done ? "border-primary bg-primary/10" : "border-white/10 bg-white/5"} p-3 flex flex-col items-center justify-center text-xs hover:bg-white/10 transition`}
                    >
                      <div className="text-2xl mb-2">{done ? "✓" : "📸"}</div>
                      <div className="text-center text-muted-foreground">{i + 1}. {p}</div>
                    </button>
                  );
                })}
              </div>
              <div className="text-xs text-muted-foreground mt-4">{photos.length} / {PHOTO_STEPS.length} photos</div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-6">
              <div className="text-xs uppercase tracking-widest text-primary mb-2">Estimation IA</div>
              <h2 className="text-3xl font-black">
                {brand} {model} <span className="text-muted-foreground">{year}</span>
              </h2>
              <div className="my-10">
                <div className="text-6xl font-black text-gradient">28 500 €</div>
                <div className="text-sm text-muted-foreground mt-2">Valeur marché estimée</div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="glass rounded-2xl p-4">
                  <div className="text-xs text-muted-foreground">Basse</div>
                  <div className="font-bold mt-1">26 800 €</div>
                </div>
                <div className="glass rounded-2xl p-4 glow">
                  <div className="text-xs text-muted-foreground">Moyenne</div>
                  <div className="font-bold mt-1 text-gradient">28 500 €</div>
                </div>
                <div className="glass rounded-2xl p-4">
                  <div className="text-xs text-muted-foreground">Haute</div>
                  <div className="font-bold mt-1">30 200 €</div>
                </div>
              </div>
              <Link to="/matches" className="inline-block mt-10 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-full font-semibold glow">
                Voir mes matches
              </Link>
            </div>
          )}

          {step < 3 && (
            <div className="flex justify-between mt-8">
              <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="glass px-6 py-3 rounded-full disabled:opacity-40">
                Précédent
              </button>
              <button onClick={() => setStep((s) => s + 1)} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-full font-semibold glow">
                Suivant
              </button>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}