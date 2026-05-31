import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export function Header() {
  const { user, signOut } = useAuth();
  return (
    <nav className="fixed top-0 inset-x-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 glow" />
          <span className="text-lg font-bold tracking-tight">
            SWAPCARS <span className="text-gradient">AI</span>
          </span>
        </Link>
        <div className="hidden md:flex gap-8 text-sm text-muted-foreground">
          <Link to="/explore" className="hover:text-foreground transition" activeProps={{ className: "text-foreground" }}>Explorer</Link>
          <Link to="/matches" className="hover:text-foreground transition" activeProps={{ className: "text-foreground" }}>Matches</Link>
          <Link to="/chat" className="hover:text-foreground transition" activeProps={{ className: "text-foreground" }}>Messages</Link>
          <Link to="/profile" className="hover:text-foreground transition" activeProps={{ className: "text-foreground" }}>Profil</Link>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/add-vehicle"
                className="hidden sm:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold transition glow"
              >
                Déposer
              </Link>
              <button
                onClick={signOut}
                className="text-sm text-muted-foreground hover:text-foreground transition"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold transition glow"
            >
              Connexion
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/10 py-10 px-6 md:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
        <div className="font-semibold tracking-tight">
          SWAPCARS <span className="text-gradient">AI</span> © 2026
        </div>
        <div className="text-muted-foreground">Le futur de l'échange automobile.</div>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-24">{children}</main>
      <Footer />
    </div>
  );
}