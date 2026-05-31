import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Header, Footer } from "@/components/layout/Header";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Connexion — SwapCars AI" }] }),
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

  useEffect(() => {
    if (user) navigate({ to: "/profile" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
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
        toast.success("Compte créé. Vérifie ton email pour confirmer.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenue !");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) {
      toast.error("Erreur Google: " + (res.error.message ?? "inconnue"));
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-32 pb-16 px-6">
        <div className="max-w-md mx-auto glass rounded-3xl p-8 md:p-10">
          <h1 className="text-3xl font-black tracking-tight mb-2">
            {mode === "signin" ? "Connexion" : "Créer un compte"}
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Accède au matching IA et dépose ta voiture.
          </p>

          <button
            onClick={google}
            disabled={busy}
            className="w-full mb-4 px-4 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition disabled:opacity-50"
          >
            Continuer avec Google
          </button>

          <div className="flex items-center gap-3 my-6 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-white/10" />
            ou
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <input
                className="input w-full"
                placeholder="Nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            <input
              className="input w-full"
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="input w-full"
              type="password"
              placeholder="Mot de passe"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              disabled={busy}
              className="w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition disabled:opacity-50 glow"
            >
              {mode === "signin" ? "Se connecter" : "Créer le compte"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full mt-4 text-xs text-muted-foreground hover:text-foreground transition"
          >
            {mode === "signin"
              ? "Pas encore de compte ? Créer un compte"
              : "Déjà un compte ? Se connecter"}
          </button>

          <Link to="/" className="block text-center text-xs text-muted-foreground hover:text-foreground mt-6">
            ← Retour à l'accueil
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}