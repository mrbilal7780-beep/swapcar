import { compressImage } from "@/lib/image";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, useAuth } from "@/lib/auth";
import { PageShell } from "@/components/layout/Header";
import { ArrowLeft, Bell, Camera, Database, Download, KeyRound, LogOut, MapPin, Shield, Trash2, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { callApi, disablePush, enablePush, getPushState, type PushState } from "@/lib/push";
import { activateNearby, deactivateNearby, geoPermission, getPosition, savePosition, type GeoPermission } from "@/lib/nearby";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Paramètres — TORQUE" }] }),
  component: () => <RequireAuth><Settings /></RequireAuth>,
});

type Prefs = {
  push_enabled: boolean;
  likes: boolean;
  comments: boolean;
  follows: boolean;
  messages: boolean;
  events_nearby: boolean;
  event_updates: boolean;
  event_chat: boolean;
  quiet_enabled: boolean;
  quiet_start: number;
  quiet_end: number;
  radius_km: number;
  home_lat: number | null;
  home_lng: number | null;
  home_label: string | null;
  auto_locate: boolean;
  home_updated_at: string | null;
};

const DEFAULT_PREFS: Prefs = {
  push_enabled: true,
  likes: true,
  comments: true,
  follows: true,
  messages: true,
  events_nearby: true,
  event_updates: true,
  event_chat: true,
  quiet_enabled: false,
  quiet_start: 22,
  quiet_end: 8,
  radius_km: 50,
  home_lat: null,
  home_lng: null,
  home_label: null,
  auto_locate: false,
  home_updated_at: null,
};

const USERNAME_RE = /^[a-z0-9._]{3,24}$/;
const inputCls =
  "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[16px] sm:text-sm focus:outline-none focus:border-primary";

function Settings() {
  const { user, signOut } = useAuth();
  const userId = user!.id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ---------- Profil ----------
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
    const cleanUsername = username.trim();
    if (cleanUsername && cleanUsername !== (profile?.username ?? "") && !USERNAME_RE.test(cleanUsername)) {
      toast.error("Nom d'utilisateur : 3 à 24 caractères, minuscules, chiffres, point ou tiret bas.");
      return;
    }
    setSaving(true);
    let finalAvatarUrl = avatarUrl;

    if (avatarFile) {
      // Recadrage carré 512 px + compression : n'importe quelle photo passe, quelle que soit sa taille.
      let toUpload: Blob = avatarFile;
      let ext = avatarFile.name.split(".").pop() ?? "jpg";
      try {
        toUpload = await compressImage(avatarFile, { maxSize: 512, square: true, quality: 0.85 });
        ext = "jpg";
      } catch {
        // Format illisible par le navigateur : on envoie le fichier d'origine tel quel.
      }
      const path = `${userId}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, toUpload, { upsert: true, contentType: toUpload.type || undefined });
      if (uploadError) {
        toast.error("Erreur upload avatar : " + uploadError.message);
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      finalAvatarUrl = `${urlData.publicUrl}?v=${Date.now()}`;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        username: cleanUsername || null,
        bio: bio.trim() || null,
        city: city.trim() || null,
        avatar_url: finalAvatarUrl || null,
      })
      .eq("user_id", userId);

    setSaving(false);
    if (error) {
      toast.error(error.code === "23505" ? "Ce nom d'utilisateur est déjà pris." : "Erreur : " + error.message);
      return;
    }
    setAvatarFile(null);
    setAvatarUrl(finalAvatarUrl);
    toast.success("Profil mis à jour");
    qc.invalidateQueries({ queryKey: ["profile", userId] });
  };

  const currentAvatar = avatarPreview || avatarUrl;
  const initials = (displayName || user!.email || "?").slice(0, 2).toUpperCase();

  // ---------- Notifications ----------
  const { data: prefsRow } = useQuery({
    queryKey: ["notif-prefs", userId],
    queryFn: async () => {
      const { data } = await supabase.from("notification_prefs").select("*").eq("user_id", userId).maybeSingle();
      return data;
    },
  });
  const prefs: Prefs = { ...DEFAULT_PREFS, ...(prefsRow ?? {}) };

  const updatePrefs = useMutation({
    mutationFn: async (partial: Partial<Prefs>) => {
      const next = { ...prefs, ...partial };
      const { error } = await supabase
        .from("notification_prefs")
        .upsert({ user_id: userId, ...next, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onMutate: async (partial) => {
      await qc.cancelQueries({ queryKey: ["notif-prefs", userId] });
      const previous = qc.getQueryData(["notif-prefs", userId]);
      qc.setQueryData(["notif-prefs", userId], { ...prefs, ...partial, user_id: userId });
      return { previous };
    },
    onError: (e: any, _p, ctx) => {
      qc.setQueryData(["notif-prefs", userId], ctx?.previous);
      toast.error("Réglage non enregistré : " + (e?.message ?? "erreur"));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["notif-prefs", userId] }),
  });

  const [pushState, setPushState] = useState<PushState>("unsupported");
  const [pushBusy, setPushBusy] = useState(false);
  useEffect(() => {
    getPushState().then(setPushState);
  }, []);

  const togglePush = async (on: boolean) => {
    setPushBusy(true);
    try {
      if (on) {
        await enablePush();
        updatePrefs.mutate({ push_enabled: true });
        toast.success("Notifications activées sur cet appareil");
      } else {
        await disablePush();
        toast.success("Notifications désactivées sur cet appareil");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Action impossible");
    } finally {
      setPushBusy(false);
      setPushState(await getPushState());
    }
  };

  // Détection automatique des rassos près de moi
  const [geoState, setGeoState] = useState<GeoPermission>("prompt");
  const [nearbyBusy, setNearbyBusy] = useState(false);
  useEffect(() => {
    geoPermission().then(setGeoState);
  }, []);

  const toggleNearby = async (on: boolean) => {
    setNearbyBusy(true);
    try {
      if (on) {
        const r = await activateNearby(userId);
        toast.success(
          r.push
            ? "Détection activée : tu seras prévenu des rassos près de toi."
            : "Position enregistrée. Active aussi les notifications ci-dessus pour recevoir les alertes."
        );
      } else {
        await deactivateNearby(userId);
        toast.success("Détection désactivée, ta position a été effacée.");
      }
      qc.invalidateQueries({ queryKey: ["notif-prefs", userId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Action impossible");
    } finally {
      setNearbyBusy(false);
      setPushState(await getPushState());
      setGeoState(await geoPermission());
    }
  };

  const refreshNow = async () => {
    setNearbyBusy(true);
    try {
      await savePosition(userId, await getPosition());
      qc.invalidateQueries({ queryKey: ["notif-prefs", userId] });
      toast.success("Position mise à jour");
    } catch (e: any) {
      toast.error(e?.message ?? "Mise à jour impossible");
    } finally {
      setNearbyBusy(false);
    }
  };

  const updatedLabel = (() => {
    if (!prefs.home_updated_at) return "à l'instant";
    const m = Math.floor((Date.now() - new Date(prefs.home_updated_at).getTime()) / 60000);
    if (m < 2) return "à l'instant";
    if (m < 60) return `il y a ${m} min`;
    if (m < 1440) return `il y a ${Math.floor(m / 60)} h`;
    return `il y a ${Math.floor(m / 1440)} j`;
  })();

  // ---------- Sécurité ----------
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secBusy, setSecBusy] = useState(false);

  const changeEmail = async () => {
    if (!/^\S+@\S+\.\S+$/.test(newEmail)) {
      toast.error("Adresse e-mail invalide.");
      return;
    }
    setSecBusy(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setSecBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("E-mail de confirmation envoyé. Clique sur le lien pour valider.");
      setNewEmail("");
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 8) {
      toast.error("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setSecBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSecBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Mot de passe mis à jour.");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const signOutOthers = async () => {
    const { error } = await supabase.auth.signOut({ scope: "others" });
    if (error) toast.error(error.message);
    else toast.success("Tes autres appareils ont été déconnectés.");
  };

  const signOutEverywhere = async () => {
    await supabase.auth.signOut({ scope: "global" });
  };

  // ---------- Données ----------
  const [exporting, setExporting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const exportData = async () => {
    setExporting(true);
    try {
      const grab = async (table: string, column: string) => {
        try {
          const { data } = await supabase.from(table).select("*").eq(column, userId).limit(5000);
          return data ?? [];
        } catch {
          return [];
        }
      };
      const out = {
        exporte_le: new Date().toISOString(),
        compte: { id: userId, email: user!.email, cree_le: user!.created_at },
        profil: (await grab("profiles", "user_id"))[0] ?? null,
        publications: await grab("posts", "author_id"),
        commentaires: await grab("comments", "user_id"),
        jaime: await grab("likes", "user_id"),
        abonnements: await grab("followings", "follower_id"),
        abonnes: await grab("followings", "following_id"),
        vehicules: await grab("vehicles", "owner_id"),
        rassos_organises: await grab("events", "organizer_id"),
        participations: await grab("event_attendees", "user_id"),
        messages_envoyes: await grab("messages", "sender_id"),
        reglages_notifications: await grab("notification_prefs", "user_id"),
      };
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "torque-mes-donnees.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Tes données ont été téléchargées.");
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await callApi("delete-account", { confirm: "SUPPRIMER" });
      await supabase.auth.signOut();
      toast.success("Ton compte a été supprimé.");
      navigate({ to: "/login" } as any);
    } catch (e: any) {
      toast.error("Suppression impossible : " + (e?.message ?? "erreur"));
    } finally {
      setDeleting(false);
    }
  };

  const hours = Array.from({ length: 24 }, (_, h) => h);
  const lastSignIn = user!.last_sign_in_at
    ? new Date(user!.last_sign_in_at).toLocaleString("fr-BE", { dateStyle: "medium", timeStyle: "short" })
    : "—";

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-4 pb-8">
        <div className="flex items-center gap-3 py-3">
          <button
            onClick={() => navigate({ to: "/profile" } as any)}
            aria-label="Retour"
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-black">Paramètres</h1>
        </div>

        <div className="space-y-5">
          {/* ---------- Profil ---------- */}
          <Card icon={User} title="Profil">
            <div className="flex justify-center">
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
                  aria-label="Changer la photo"
                  className="absolute bottom-0 right-0 w-9 h-9 bg-primary rounded-full flex items-center justify-center border-2 border-background hover:bg-primary/90 transition"
                >
                  <Camera className="w-4 h-4 text-white" />
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
              </div>
            </div>
            <Field label="Nom affiché">
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} className={inputCls} />
            </Field>
            <Field label="Nom d'utilisateur" hint="3 à 24 caractères : minuscules, chiffres, point ou tiret bas.">
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={30} autoCapitalize="none" className={inputCls} />
            </Field>
            <Field label="Bio">
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={200} className={`${inputCls} resize-none`} />
            </Field>
            <Field label="Ville">
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} className={inputCls} />
            </Field>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-3 rounded-xl font-semibold transition"
            >
              {saving ? "Enregistrement…" : "Enregistrer le profil"}
            </button>
          </Card>

          {/* ---------- Notifications ---------- */}
          <Card icon={Bell} title="Notifications" id="notifications">
            <Row
              label="Notifications sur cet appareil"
              desc={
                pushState === "unsupported"
                  ? "Non disponible ici. Sur iPhone, ajoute d'abord TORQUE à l'écran d'accueil (Partager puis « Sur l'écran d'accueil »)."
                  : pushState === "denied"
                  ? "Bloquées dans ton navigateur : autorise-les dans les réglages du site."
                  : "Reçois une alerte avec le logo TORQUE, même quand l'app est fermée."
              }
            >
              <Switch
                checked={pushState === "enabled"}
                disabled={pushBusy || pushState === "unsupported" || pushState === "denied"}
                onChange={togglePush}
              />
            </Row>

            <div className="border-t border-white/10 pt-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Me prévenir pour</p>
              <Row label="Messages"><Switch checked={prefs.messages} onChange={(v) => updatePrefs.mutate({ messages: v })} /></Row>
              <Row label="J'aime"><Switch checked={prefs.likes} onChange={(v) => updatePrefs.mutate({ likes: v })} /></Row>
              <Row label="Commentaires"><Switch checked={prefs.comments} onChange={(v) => updatePrefs.mutate({ comments: v })} /></Row>
              <Row label="Nouveaux abonnés"><Switch checked={prefs.follows} onChange={(v) => updatePrefs.mutate({ follows: v })} /></Row>
              <Row label="Rassos près de chez moi"><Switch checked={prefs.events_nearby} onChange={(v) => updatePrefs.mutate({ events_nearby: v })} /></Row>
              <Row label="Mes rassos" desc="Nouveaux participants, annulations.">
                <Switch checked={prefs.event_updates} onChange={(v) => updatePrefs.mutate({ event_updates: v })} />
              </Row>
              <Row label="Discussions de rasso"><Switch checked={prefs.event_chat} onChange={(v) => updatePrefs.mutate({ event_chat: v })} /></Row>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-3">
              <Row label="Heures calmes" desc="Aucune alerte sur le téléphone pendant cette période.">
                <Switch checked={prefs.quiet_enabled} onChange={(v) => updatePrefs.mutate({ quiet_enabled: v })} />
              </Row>
              {prefs.quiet_enabled && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">De</span>
                  <select
                    value={prefs.quiet_start}
                    onChange={(e) => updatePrefs.mutate({ quiet_start: Number(e.target.value) })}
                    className={`${inputCls} !w-24`}
                  >
                    {hours.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")} h</option>)}
                  </select>
                  <span className="text-muted-foreground">à</span>
                  <select
                    value={prefs.quiet_end}
                    onChange={(e) => updatePrefs.mutate({ quiet_end: Number(e.target.value) })}
                    className={`${inputCls} !w-24`}
                  >
                    {hours.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")} h</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold">Rassos près de chez moi</p>
              </div>
              <Row
                label="Détection automatique"
                desc="Repère les rassos autour de toi et te prévient dès qu'un nouveau est créé."
              >
                <Switch checked={!!prefs.auto_locate} disabled={nearbyBusy || geoState === "unsupported"} onChange={toggleNearby} />
              </Row>
              {geoState === "unsupported" && (
                <p className="text-xs text-muted-foreground">La localisation n'est pas disponible sur cet appareil.</p>
              )}
              {geoState === "denied" && !prefs.auto_locate && (
                <p className="text-xs text-amber-300 bg-amber-500/10 rounded-xl p-3 leading-snug">
                  La localisation est bloquée pour ce site. Clique sur le cadenas dans la barre d'adresse, autorise la
                  position, puis réessaie.
                </p>
              )}
              {prefs.auto_locate && (
                <>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Position mise à jour {updatedLabel}. Elle est actualisée à chaque ouverture de l'app et reste
                    visible uniquement par toi. Un site web ne peut pas te suivre en arrière-plan : l'app mobile le
                    permettra plus tard.
                  </p>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">Rayon</span>
                    <select
                      value={prefs.radius_km}
                      onChange={(e) => updatePrefs.mutate({ radius_km: Number(e.target.value) })}
                      className={`${inputCls} !w-28`}
                    >
                      {[10, 25, 50, 100, 200].map((r) => <option key={r} value={r}>{r} km</option>)}
                    </select>
                    <button
                      onClick={refreshNow}
                      disabled={nearbyBusy}
                      className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-semibold disabled:opacity-40 transition"
                    >
                      Actualiser
                    </button>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* ---------- Sécurité ---------- */}
          <Card icon={Shield} title="Sécurité du compte">
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">E-mail :</span> {user!.email ?? "—"}</p>
              <p><span className="text-muted-foreground">Dernière connexion :</span> {lastSignIn}</p>
            </div>

            <Field label="Changer l'adresse e-mail">
              <div className="flex gap-2">
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="nouvelle@adresse.com" className={inputCls} />
                <button
                  onClick={changeEmail}
                  disabled={secBusy || !newEmail}
                  className="px-4 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-semibold disabled:opacity-40 transition flex-shrink-0"
                >
                  Valider
                </button>
              </div>
            </Field>

            <Field label="Changer le mot de passe" hint="8 caractères minimum.">
              <div className="space-y-2">
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nouveau mot de passe" autoComplete="new-password" className={inputCls} />
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmer" autoComplete="new-password" className={inputCls} />
                <button
                  onClick={changePassword}
                  disabled={secBusy || !newPassword}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-semibold disabled:opacity-40 transition flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" /> Mettre à jour le mot de passe
                </button>
              </div>
            </Field>

            <div className="border-t border-white/10 pt-4 space-y-2">
              <button onClick={signOutOthers} className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold hover:bg-white/10 transition">
                Déconnecter mes autres appareils
              </button>
              <button onClick={signOutEverywhere} className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold hover:bg-white/10 transition">
                Me déconnecter partout
              </button>
              <p className="text-[11px] text-muted-foreground pt-1">
                Double authentification : bientôt disponible.
              </p>
            </div>
          </Card>

          {/* ---------- Données ---------- */}
          <Card icon={Database} title="Mes données">
            <button
              onClick={exportData}
              disabled={exporting}
              className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold hover:bg-white/10 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> {exporting ? "Préparation…" : "Télécharger mes données"}
            </button>
            <p className="text-xs text-muted-foreground">
              Un fichier contenant ton profil, tes publications, commentaires, j'aime, abonnements, véhicules,
              rassos et messages envoyés.
            </p>

            {!showDelete ? (
              <button
                onClick={() => setShowDelete(true)}
                className="w-full py-2.5 rounded-xl border border-red-400/30 text-red-400 text-sm font-semibold hover:bg-red-500/10 transition flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Supprimer mon compte
              </button>
            ) : (
              <div className="rounded-2xl border border-red-400/30 bg-red-500/5 p-4 space-y-3">
                <p className="text-sm font-semibold text-red-300">Suppression définitive</p>
                <p className="text-xs text-muted-foreground">
                  Ton compte, ton profil et tes données seront supprimés. Cette action est irréversible.
                  Tape <span className="font-bold text-foreground">SUPPRIMER</span> pour confirmer.
                </p>
                <input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder="SUPPRIMER" className={inputCls} />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowDelete(false); setDeleteText(""); }}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={deleteAccount}
                    disabled={deleteText !== "SUPPRIMER" || deleting}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-40"
                  >
                    {deleting ? "…" : "Supprimer"}
                  </button>
                </div>
              </div>
            )}
          </Card>

          {/* ---------- Déconnexion ---------- */}
          <button
            onClick={signOut}
            className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-red-400 font-semibold transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Se déconnecter
          </button>
          <p className="text-center text-[11px] text-muted-foreground">TORQUE · version bêta</p>
        </div>
      </div>
    </PageShell>
  );
}

function Card({
  icon: Icon,
  title,
  id,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-3xl bg-white/[0.03] border border-white/10 p-5 space-y-4 scroll-mt-4">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <h2 className="font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition flex-shrink-0 disabled:opacity-40 ${checked ? "bg-primary" : "bg-white/15"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : ""}`}
      />
    </button>
  );
}
