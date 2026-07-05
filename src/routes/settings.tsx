import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { PageShell } from "@/components/layout/Header";
import { ArrowLeft, Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Paramètres — TORQUE" }] }),
  component: () => <RequireAuth><Settings /></RequireAuth>,
});

function Settings() {
  const { user, signOut } = useAuth();
  const userId = user!.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
      return data;
    },
  });

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setUsername(profile.username ?? "");
      setBio(profile.bio ?? "");
      setCity(profile.city ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
    }
  }, [profile]);

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    let finalAvatarUrl = avatarUrl;

    // Upload avatar si un nouveau fichier a été choisi
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const path = `${userId}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });

      if (uploadError) {
        toast.error("Erreur upload avatar : " + uploadError.message);
        setSaving(false);
        return;
      }

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      finalAvatarUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from("profiles").update({
      display_name: displayName || null,
      username: username || null,
      bio: bio || null,
      city: city || null,
      avatar_url: finalAvatarUrl || null,
    }).eq("user_id", userId);

    setSaving(false);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success("Profil mis à jour !");
    queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    navigate({ to: "/profile" } as any);
  };

  const currentAvatar = avatarPreview || avatarUrl;
  const initials = (displayName || user!.email || "?").slice(0, 2).toUpperCase();

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center gap-3 py-3">
          <button onClick={() => navigate({ to: "/profile" } as any)} className="p-2 -ml-2 hover:bg-white/5 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Modifier le profil</h1>
        </div>

        <div className="space-y-5 py-4">

          {/* Avatar avec bouton upload */}
          <div className="flex justify-center mb-2">
            <div className="relative">
              {currentAvatar ? (
                <img src={currentAvatar} alt="" className="w-24 h-24 rounded-full object-cover border-2 border-primary/30" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center text-3xl font-black">
                  {initials}
                </div>
              )}
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-2 border-background hover:bg-primary/90 transition"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarPick}
              />
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground -mt-3">
            Appuie sur l'icône pour changer ta photo
          </p>

          <Field label="Nom affiché">
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
            />
          </Field>

          <Field label="Nom d'utilisateur">
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
            />
          </Field>

          <Field label="Bio">
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary resize-none"
            />
          </Field>

          <Field label="Ville">
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
            />
          </Field>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-3 rounded-lg font-semibold transition"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>

          <div className="pt-6 border-t border-white/10">
            <button
              onClick={signOut}
              className="w-full text-center py-2 text-sm text-red-400 hover:text-red-300 transition"
            >
              Déconnexion
            </button>
          </div>

        </div>
      </div>
    </PageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}