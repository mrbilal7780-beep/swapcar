import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { PageShell } from "@/components/layout/Header";
import { estimateVehicle, analyzePhotos } from "@/lib/ai.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/add-vehicle")({
  head: () => ({
    meta: [{ title: "Déposer mon véhicule — SwapCars AI" }],
  }),
  component: () => <RequireAuth><AddVehicle /></RequireAuth>,
});

const FUELS = ["Essence", "Diesel", "Hybride", "Électrique"];
const TRANS = ["Automatique", "Manuelle"];

function AddVehicle() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const estimateFn = useServerFn(estimateVehicle);
  const analyzeFn = useServerFn(analyzePhotos);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    brand: "", model: "", year: "2020", mileage: "50000",
    fuel: "Essence", transmission: "Automatique", city: "", price: "", description: "",
  });
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [aiEstimate, setAiEstimate] = useState<{ price_eur: number; low_eur: number; high_eur: number; rationale: string } | null>(null);

  const steps = ["Véhicule", "Détails", "Photos", "Analyse IA"];
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function pickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 10 - photos.length);
    const next = files.map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    setPhotos((p) => [...p, ...next]);
  }

  async function runEstimate() {
    setBusy(true);
    try {
      const r = await estimateFn({
        data: {
          brand: form.brand, model: form.model,
          year: Number(form.year), mileage: Number(form.mileage),
          fuel: form.fuel, transmission: form.transmission,
          description: form.description,
        },
      });
      setAiEstimate(r);
      if (!form.price) set("price", String(Math.round(r.price_eur)));
      toast.success("Estimation IA prête");
    } catch (e: any) {
      toast.error("Erreur IA : " + e.message);
    } finally { setBusy(false); }
  }

  async function publish() {
    if (!form.brand || !form.model || !form.price) {
      toast.error("Marque, modèle et prix requis");
      return;
    }
    setBusy(true);
    try {
      // 1. Insert vehicle
      const { data: vehicle, error } = await supabase.from("vehicles").insert({
        owner_id: user!.id,
        brand: form.brand, model: form.model,
        year: Number(form.year), mileage: Number(form.mileage),
        price: Number(form.price), fuel: form.fuel, transmission: form.transmission,
        city: form.city || null, description: form.description || null,
        ai_estimate: aiEstimate?.price_eur ?? null,
        ai_summary: aiEstimate?.rationale ?? null,
      }).select().single();
      if (error) throw error;

      // 2. Upload photos
      const urls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const f = photos[i].file;
        const ext = f.name.split(".").pop() || "jpg";
        const path = `${user!.id}/${vehicle.id}/${i}.${ext}`;
        const up = await supabase.storage.from("vehicle-photos").upload(path, f, { upsert: true });
        if (up.error) throw up.error;
        const { data: pub } = supabase.storage.from("vehicle-photos").getPublicUrl(path);
        urls.push(pub.publicUrl);
      }
      if (urls.length) {
        await supabase.from("vehicles").update({ photos: urls }).eq("id", vehicle.id);
      }

      // 3. Run photo analysis in background (don't block)
      if (urls.length) {
        analyzeFn({ data: { photo_urls: urls.slice(0, 5), brand: form.brand, model: form.model } })
          .then((a) => supabase.from("vehicles").update({
            ai_body_score: a.body_score,
            ai_interior_score: a.interior_score,
            ai_mechanical_score: a.mechanical_score,
            ai_summary: a.summary,
          }).eq("id", vehicle.id))
          .catch((e) => console.error("photo analysis failed", e));
      }

      toast.success("Véhicule publié !");
      navigate({ to: "/vehicle/$id", params: { id: vehicle.id } });
    } catch (e: any) {
      toast.error("Erreur : " + e.message);
    } finally { setBusy(false); }
  }

  return (
    <PageShell>
      <section className="max-w-3xl mx-auto px-6 md:px-8 py-8">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          Déposer <span className="text-gradient">mon véhicule</span>
        </h1>
        <p className="text-muted-foreground mt-2">L'IA analyse votre voiture en quelques minutes.</p>

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
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Marque"><input className="input" value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="BMW" /></Field>
              <Field label="Modèle"><input className="input" value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="M340i" /></Field>
              <Field label="Année"><input type="number" className="input" value={form.year} onChange={(e) => set("year", e.target.value)} /></Field>
              <Field label="Kilométrage"><input type="number" className="input" value={form.mileage} onChange={(e) => set("mileage", e.target.value)} /></Field>
            </div>
          )}

          {step === 1 && (
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Carburant">
                <select className="input" value={form.fuel} onChange={(e) => set("fuel", e.target.value)}>
                  {FUELS.map((f) => <option key={f}>{f}</option>)}
                </select>
              </Field>
              <Field label="Transmission">
                <select className="input" value={form.transmission} onChange={(e) => set("transmission", e.target.value)}>
                  {TRANS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Ville"><input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Paris" /></Field>
              <Field label="Prix demandé (€)"><input type="number" className="input" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="28500" /></Field>
              <div className="md:col-span-2">
                <Field label="Description">
                  <textarea className="input min-h-[100px]" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="État, équipements, entretien…" />
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-sm text-muted-foreground mb-6">Ajoutez jusqu'à 10 photos. L'IA les analysera après publication.</p>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={pickPhotos} />
              <button onClick={() => fileRef.current?.click()} className="glass px-6 py-4 rounded-2xl hover:bg-white/10 w-full">
                + Ajouter des photos
              </button>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mt-6">
                {photos.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden">
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-black/60 rounded-full w-6 h-6 text-xs">✕</button>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground mt-4">{photos.length} / 10 photos</div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-4">
              <div className="text-xs uppercase tracking-widest text-primary mb-2">Estimation IA</div>
              <h2 className="text-2xl font-black">{form.brand} {form.model} <span className="text-muted-foreground">{form.year}</span></h2>

              {!aiEstimate ? (
                <button onClick={runEstimate} disabled={busy || !form.brand || !form.model} className="mt-8 bg-primary px-8 py-4 rounded-full font-semibold glow disabled:opacity-50">
                  {busy ? "Analyse…" : "Lancer l'estimation IA"}
                </button>
              ) : (
                <>
                  <div className="my-8">
                    <div className="text-5xl font-black text-gradient">{Math.round(aiEstimate.price_eur).toLocaleString("fr-FR")} €</div>
                    <div className="text-sm text-muted-foreground mt-2">Valeur marché estimée</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <Range label="Basse" v={aiEstimate.low_eur} />
                    <Range label="Moyenne" v={aiEstimate.price_eur} highlight />
                    <Range label="Haute" v={aiEstimate.high_eur} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-6 max-w-xl mx-auto">{aiEstimate.rationale}</p>
                  <button onClick={publish} disabled={busy} className="mt-8 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-full font-semibold glow disabled:opacity-50">
                    {busy ? "Publication…" : "Publier mon véhicule"}
                  </button>
                </>
              )}
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

function Range({ label, v, highlight }: { label: string; v: number; highlight?: boolean }) {
  return (
    <div className={`glass rounded-2xl p-4 ${highlight ? "glow" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-bold mt-1 ${highlight ? "text-gradient" : ""}`}>{Math.round(v).toLocaleString("fr-FR")} €</div>
    </div>
  );
}