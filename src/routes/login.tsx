import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, ArrowLeft } from "lucide-react";
import { VideoBackground } from "@/components/VideoBackground";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Connexion — TORQUE" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/feed" });
  }, [user, navigate]);

  const resendConfirmation = async () => {
    if (!email) return;
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    if (error) toast.error("Erreur : " + error.message);
    else toast.success("Email de confirmation renvoyé !");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNeedsConfirmation(false);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name },
          },
        });
        if (error) throw error;
        setAwaitingConfirmation(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (/confirm/i.test(error.message)) {
            setNeedsConfirmation(true);
            throw new Error("Ton adresse email n'est pas encore confirmée.");
          }
          throw error;
        }
        toast.success("Bienvenue sur TORQUE !");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Une erreur est survenue");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) {
      toast.error("Erreur Google : " + (res.error.message ?? "inconnue"));
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen relative text-foreground flex flex-col overflow-hidden bg-background">
      <style>{`
        html { padding-top: max(0px, env(safe-area-inset-top)); padding-bottom: max(0px, env(safe-area-inset-bottom)); padding-left: max(0px, env(safe-area-inset-left)); padding-right: max(0px, env(safe-area-inset-right)); }
      `}</style>

      <VideoBackground />

      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 pt-8 pb-6 sm:pt-0">
        <div className="max-w-sm mx-auto w-full">
          {awaitingConfirmation ? (
            <ConfirmationScreen
              email={email}
              onBack={() => setAwaitingConfirmation(false)}
              onResend={resendConfirmation}
              resending={resending}
            />
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 mb-6 shadow-xl shadow-primary/20">
                  <span className="text-4xl font-black">T</span>
                </div>
                <h1 className="text-4xl font-black tracking-tight">TORQUE</h1>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mt-3">
                  Le réseau social automobile premium
                </p>
              </div>

              <div className="flex gap-3 mb-6 bg-white/5 rounded-xl p-1 backdrop-blur-md border border-white/10">
                <button
                  onClick={() => { setMode("signin"); setPassword(""); setNeedsConfirmation(false); }}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${
                    mode === "signin"
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Connexion
                </button>
                <button
                  onClick={() => { setMode("signup"); setPassword(""); setNeedsConfirmation(false); }}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${
                    mode === "signup"
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Créer un compte
                </button>
              </div>

              <button
                onClick={google}
                disabled={busy}
                className="w-full mb-4 px-4 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition disabled:opacity-50 active:scale-95 duration-150"
              >
                Continuer avec Google
              </button>

              <div className="flex items-center gap-3 my-5 text-xs text-muted-foreground">
                <div className="flex-1 h-px bg-white/10" />
                ou
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <form onSubmit={submit} className="space-y-3 mb-4">
                {mode === "signup" && (
                  <input
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition backdrop-blur-sm"
                    placeholder="Nom complet"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={busy}
                  />
                )}
                <input
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition backdrop-blur-sm"
                  type="email"
                  placeholder="Email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={busy}
                  autoCapitalize="off"
                  spellCheck="false"
                />
                <div className="relative">
                  <input
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition backdrop-blur-sm pr-11"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mot de passe"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {needsConfirmation && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200 space-y-2">
                    <p>Ton compte existe mais ton email n'est pas encore confirmé.</p>
                    <button
                      type="button"
                      onClick={resendConfirmation}
                      disabled={resending}
                      className="font-semibold text-amber-100 underline disabled:opacity-50"
                    >
                      {resending ? "Envoi..." : "Renvoyer l'email de confirmation"}
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-sm hover:shadow-lg hover:shadow-primary/30 transition disabled:opacity-50 active:scale-95 duration-150 mt-2"
                >
                  {busy ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      {mode === "signin" ? "Connexion..." : "Création du compte..."}
                    </span>
                  ) : mode === "signin" ? (
                    "Se connecter"
                  ) : (
                    "Créer mon compte"
                  )}
                </button>
              </form>

              <div className="text-center text-xs text-muted-foreground mb-3">
                {mode === "signin" ? "Nouveau sur TORQUE ?" : "Déjà un compte ?"}{" "}
                <button
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="text-primary hover:text-primary/80 font-semibold transition"
                >
                  {mode === "signin" ? "Créer un compte" : "Se connecter"}
                </button>
              </div>

              <div className="text-center text-xs text-muted-foreground/60">
                En continuant, tu acceptes nos Conditions et notre Politique de confidentialité
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmationScreen({
  email,
  onBack,
  onResend,
  resending,
}: {
  email: string;
  onBack: () => void;
  onResend: () => void;
  resending: boolean;
}) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 mb-6 shadow-xl shadow-primary/20">
        <Mail className="w-9 h-9" />
      </div>
      <h1 className="text-2xl font-black mb-2">Vérifie ta boîte mail</h1>
      <p className="text-sm text-muted-foreground mb-1">
        On a envoyé un lien de confirmation à
      </p>
      <p className="text-sm font-semibold mb-6">{email}</p>
      <p className="text-xs text-muted-foreground mb-8 leading-relaxed">
        Clique sur le lien reçu par email pour activer ton compte TORQUE.
        Pense à vérifier tes spams si tu ne le vois pas passer.
      </p>
      <button
        onClick={onResend}
        disabled={resending}
        className="w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:shadow-lg hover:shadow-primary/30 transition disabled:opacity-50 active:scale-95 duration-150 mb-3"
      >
        {resending ? "Envoi..." : "Renvoyer l'email"}
      </button>
      <button
        onClick={onBack}
        className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition py-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour
      </button>
    </div>
  );
}
