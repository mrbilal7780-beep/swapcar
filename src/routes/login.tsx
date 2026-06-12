import { createFileRoute, Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign In — TORQUE" }] }),
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

  useEffect(() => {
    if (user) navigate({ to: "/feed" });
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
        toast.success("Account created. Check your email to confirm.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome to TORQUE!");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) {
      toast.error("Google error: " + (res.error.message ?? "unknown"));
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 text-foreground flex flex-col">
      <style>{`html { padding-top: max(0px, env(safe-area-inset-top)); padding-bottom: max(0px, env(safe-area-inset-bottom)); padding-left: max(0px, env(safe-area-inset-left)); padding-right: max(0px, env(safe-area-inset-right)); }`}</style>
      
      <div className="flex-1 flex flex-col justify-center px-6 pt-8 pb-6 sm:pt-0">
        <div className="max-w-sm mx-auto w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 mb-6">
              <span className="text-4xl font-black">T</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight">TORQUE</h1>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mt-3">Premium Automotive Network</p>
          </div>

          <div className="flex gap-3 mb-6 bg-white/5 rounded-xl p-1 backdrop-blur-sm border border-white/10">
            <button
              onClick={() => { setMode("signin"); setPassword(""); }}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${
                mode === "signin"
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode("signup"); setPassword(""); }}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${
                mode === "signup"
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign Up
            </button>
          </div>

          <button
            onClick={google}
            disabled={busy}
            className="w-full mb-4 px-4 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition disabled:opacity-50 active:scale-95 duration-150"
          >
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-5 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-white/10" />
            or
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-3 mb-4">
            {mode === "signup" && (
              <input
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition backdrop-blur-sm"
                placeholder="Full Name"
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
                placeholder="Password"
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
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-sm hover:shadow-lg hover:shadow-primary/30 transition disabled:opacity-50 active:scale-95 duration-150 mt-2"
            >
              {busy ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {mode === "signin" ? "Signing in..." : "Creating account..."}
                </span>
              ) : mode === "signin" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="text-center text-xs text-muted-foreground mb-3">
            {mode === "signin" ? "New to TORQUE?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-primary hover:text-primary/80 font-semibold transition"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </div>

          <div className="text-center text-xs text-muted-foreground/60">
            By continuing, you agree to our Terms & Privacy Policy
          </div>
        </div>
      </div>
    </div>
  );
}
