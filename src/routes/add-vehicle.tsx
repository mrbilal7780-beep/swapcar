import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { PageShell } from "@/components/layout/Header";
import { toast } from "sonner";
import { ArrowLeft, Camera, X } from "lucide-react";

export const Route = createFileRoute("/add-vehicle")({
  head: () => ({ meta: [{ title: "Véhicule — TORQUE" }] }),
  validateSearch: z.object({ edit: z.string().optional() }),
  component: () => <RequireAuth><AddVehicle /></RequireAuth>,
});

const BRANDS = ["Audi","BMW","Citroën","Ferrari","Ford","Honda","Hyundai","Kia","Lamborghini","Mazda","Mercedes","Nissan","Opel","Peugeot","Porsche","Renault","Toyota","Volkswagen","Volvo","Autre"];
const FUELS = ["Essence","Diesel","Hybride","Électrique","GPL"];

function AddVehicle() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { edit: editId } = Route.useSearch();
  const isEditing = !!editId;
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["vehicle", editId],
    enabled: isEditing,
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("*").eq("id", editId!).maybeSingle();
      return data;
    },
  });

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
  // Photos déjà en ligne (édition) — distinctes des nouvelles à uploader
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setForm({
      make: existing.make ?? "",
      model: existing.model ?? "",
      year: String(existing.year ?? new Date().getFullYear()),
      vin: existing.vin ?? "",
      fuel: existing.fuel ?? "Essence",
      mileage: existing.mileage ? String(existing.mileage) : "",
      price: existing.price ? String(existing.price) : "",
      description: existing.description ?? "",
    });
    setExistingPhotos(existing.photos ?? []);
  }, [existing]);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const totalPhotoCount = existingPhotos.length + photos.length;

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const newPhotos = files.map(f => ({ file: f, url: URL.createObjectURL(f) }));
    setPhotos(p => [...p, ...newPhotos].slice(0, 6 - existingPhotos.length));
  };

  const handleSubmit = async () => {
    if (!form.make || !form.model) {
      toast.error("Marque et modèle obligatoires");
      return;
    }
    setSaving(true);

    // Upload des nouvelles photos
    const newPhotoUrls: string[] = [];
    for (const p of photos) {
      const ext = p.file.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("vehicle-photos")
        .upload(path, p.file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from("vehicle-photos").getPublicUrl(path);
        newPhotoUrls.push(data.publicUrl);
      }
    }

    const payload = {
      make: form.make,
      model: form.model,
      year: parseInt(form.year) || new Date().getFullYear(),
      vin: form.vin || null,
      fuel: form.fuel,
      mileage: parseInt(form.mileage) || null,
      price: parseFloat(form.price) || null,
      photos: [...existingPhotos, ...newPhotoUrls],
    };

    const { error } = isEditing
      ? await supabase.from("vehicles").update(payload).eq("id", editId!)
      : await supabase.from("vehicles").insert({
          ...payload,
          owner_id: user!.id,
          build_score: 0,
          status: "published",
        });

    setSaving(false);

    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }

    toast.success(isEditing ? "Véhicule modifié !" : "Véhicule ajouté !");
    navigate(isEditing ? { to: "/vehicle/$id", params: { id: editId! } } : { to: "/profile" } as any);
  };

  if (isEditing && loadingExisting) {
    return (
      <PageShell>
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center gap-3 py-3">
          <button onClick={() => navigate({ to: "/profile" } as any)} className="p-2 -ml-2 hover:bg-white/5 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">{isEditing ? "Modifier le véhicule" : "Ajouter un véhicule"}</h1>
        </div>

        <div className="space-y-4 pb-8">

          {/* Photos */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Photos ({totalPhotoCount}/6)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {existingPhotos.map((url, i) => (
                <div key={`existing-${i}`} className="relative aspect-square rounded-xl overflow-hidden">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setExistingPhotos(existingPhotos.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photos.map((p, i) => (
                <div key={`new-${i}`} className="relative aspect-square rounded-xl overflow-hidden">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {totalPhotoCount < 6 && (
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
            {saving ? "Enregistrement..." : isEditing ? "Enregistrer les modifications" : "Ajouter au garage"}
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
