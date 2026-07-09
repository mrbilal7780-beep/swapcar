import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { PageShell } from "@/components/layout/Header";
import { toast } from "sonner";
import { ArrowLeft, Camera, X } from "lucide-react";

export const Route = createFileRoute("/add-vehicle")({
  head: () => ({ meta: [{ title: "Ajouter un véhicule — TORQUE" }] }),
  component: () => <RequireAuth><AddVehicle /></RequireAuth>,
});

const BRANDS = ["Audi","BMW","Citroën","Ferrari","Ford","Honda","Hyundai","Kia","Lamborghini","Mazda","Mercedes","Nissan","Opel","Peugeot","Porsche","Renault","Toyota","Volkswagen","Volvo","Autre"];
const FUELS = ["Essence","Diesel","Hybride","Électrique","GPL"];

function AddVehicle() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    make: "",
    model: "",
    year: new Date().getFullYear().toString(),
    vin: "",
    fuel: "Essence",
    mileage: "",
    price: "",
    description: "",
  });
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const newPhotos = files.map(f => ({ file: f, url: URL.createObjectURL(f) }));
    setPhotos(p => [...p, ...newPhotos].slice(0, 6));
  };

  const handleSubmit = async () => {
    if (!form.make || !form.model) {
      toast.error("Marque et modèle obligatoires");
      return;
    }
    setSaving(true);

    // Upload photos
    const photoUrls: string[] = [];
    for (const p of photos) {
      const ext = p.file.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("vehicle-photos")
        .upload(path, p.file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from("vehicle-photos").getPublicUrl(path);
        photoUrls.push(data.publicUrl);
      }
    }

    const { error } = await supabase.from("vehicles").insert({
      owner_id: user!.id,
      make: form.make,
      model: form.model,
      year: parseInt(form.year) || new Date().getFullYear(),
      vin: form.vin || null,
      fuel: form.fuel,
      mileage: parseInt(form.mileage) || null,
      price: parseFloat(form.price) || null,
      photos: photoUrls,
      build_score: 0,
      status: "published",
    });

    setSaving(false);

    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }

    toast.success("Véhicule ajouté !");
    navigate({ to: "/profile" } as any);
  };

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center gap-3 py-3">
          <button onClick={() => navigate({ to: "/profile" } as any)} className="p-2 -ml-2 hover:bg-white/5 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Ajouter un véhicule</h1>
        </div>

        <div className="space-y-4 pb-8">

          {/* Photos */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Photos ({photos.length}/6)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photos.length < 6 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded-xl bg-white/5 border border-white/10 border-dashed flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition"
                >
                  <Camera className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Ajouter</span>
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotos}
            />
          </div>

          <Field label="Marque *">
            <select value={form.make} onChange={e => set("make", e.target.value)} className="input-field">
              <option value="">— Choisir —</option>
              {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>

          <Field label="Modèle *">
            <input
              type="text"
              value={form.model}
              onChange={e => set("model", e.target.value)}
              placeholder="ex: Golf, Clio, 320d..."
              className="input-field"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Année">
              <input type="number" value={form.year} onChange={e => set("year", e.target.value)} className="input-field" min="1900" max={new Date().getFullYear() + 1} />
            </Field>
            <Field label="Carburant">
              <select value={form.fuel} onChange={e => set("fuel", e.target.value)} className="input-field">
                {FUELS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Kilométrage">
              <input type="number" value={form.mileage} onChange={e => set("mileage", e.target.value)} placeholder="km" className="input-field" />
            </Field>
            <Field label="Prix estimé (€)">
              <input type="number" value={form.price} onChange={e => set("price", e.target.value)} placeholder="€" className="input-field" />
            </Field>
          </div>

          <Field label="Numéro VIN (optionnel)">
            <input
              type="text"
              value={form.vin}
              onChange={e => set("vin", e.target.value.toUpperCase())}
              placeholder="17 caractères"
              maxLength={17}
              className="input-field font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">Le VIN permet de vérifier l'authenticité de ton véhicule</p>
          </Field>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-3 rounded-xl font-semibold transition"
          >
            {saving ? "Enregistrement..." : "Ajouter au garage"}
          </button>

        </div>
      </div>

      <style>{`
        .input-field {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.5rem;
          padding: 0.625rem 1rem;
          font-size: 0.875rem;
          color: inherit;
          outline: none;
          transition: border-color 0.2s;
        }
        .input-field:focus { border-color: var(--color-primary); }
      `}</style>
    </PageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}