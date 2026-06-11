import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { NotificationsBell } from "@/components/social/NotificationsBell";

export function Header() {
  const { user, signOut } = useAuth();
  return (
    <nav className="fixed top-0 inset-x-0 z-50 glass pt-[env(safe-area-inset-top)]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 md:py-4 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 glow" />
          <span className="text-base md:text-lg font-bold tracking-tight">
            SWAPCARS <span className="text-gradient">AI</span>
          </span>
        </Link>
        <div className="hidden md:flex gap-8 text-sm text-muted-foreground">
          <Link to="/feed" className="hover:text-foreground transition" activeProps={{ className: "text-foreground" }}>Feed</Link>
          <Link to="/explore" className="hover:text-foreground transition" activeProps={{ className: "text-foreground" }}>Explorer</Link>
          <Link to="/map" className="hover:text-foreground transition" activeProps={{ className: "text-foreground" }}>Carte</Link>
          <Link to="/events" className="hover:text-foreground transition" activeProps={{ className: "text-foreground" }}>Événements</Link>
          <Link to="/garage" className="hover:text-foreground transition" activeProps={{ className: "text-foreground" }}>Garage</Link>
          <Link to="/matches" className="hover:text-foreground transition" activeProps={{ className: "text-foreground" }}>Matches</Link>
          <Link to="/chat" className="hover:text-foreground transition" activeProps={{ className: "text-foreground" }}>Messages</Link>
          <Link to="/profile" className="hover:text-foreground transition" activeProps={{ className: "text-foreground" }}>Profil</Link>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {user ? (
            <>
              <NotificationsBell />
              <Link
                to="/add-vehicle"
                className="hidden sm:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold transition glow"
              >
                Déposer
              </Link>
              <Link
                to="/profile"
                className="md:hidden w-9 h-9 rounded-full bg-secondary border border-white/10 flex items-center justify-center text-sm"
                aria-label="Profil"
              >
                👤
              </Link>
              <button
                onClick={signOut}
                className="hidden md:inline-flex text-sm text-muted-foreground hover:text-foreground transition"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 md:px-5 py-2 md:py-2.5 rounded-full text-sm font-semibold transition glow"
            >
              Connexion
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export function MobileTabBar() {
  const { user } = useAuth();
  const tabs = [
    { to: "/", icon: "🏠", label: "Accueil" },
    { to: "/explore", icon: "🚗", label: "Explorer" },
    { to: "/add-vehicle", icon: "➕", label: "Déposer", primary: true },
    { to: "/feed", icon: "📸", label: "Feed" },
    { to: user ? "/profile" : "/login", icon: user ? "👤" : "🔐", label: user ? "Profil" : "Connexion" },
  ] as const;
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 glass border-t border-white/10 pb-[env(safe-area-inset-bottom)]"
      aria-label="Navigation principale"
    >
      <ul className="flex items-center justify-around px-2 py-1.5">
        {tabs.map((t) => (
          <li key={t.to} className="flex-1">
            <Link
              to={t.to}
              className="flex flex-col items-center gap-0.5 py-1.5 text-[10px] text-muted-foreground transition"
              activeOptions={{ exact: t.to === "/" }}
              activeProps={{ className: "flex flex-col items-center gap-0.5 py-1.5 text-[10px] text-primary" }}
            >
              <span className={t.primary ? "w-10 h-10 -mt-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg glow shadow-lg" : "text-xl leading-none"}>
                {t.icon}
              </span>
              <span className={t.primary ? "mt-0.5" : ""}>{t.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="hidden md:block border-t border-white/10 py-10 px-6 md:px-8">
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
      <main className="pt-20 md:pt-24 pb-24 md:pb-0">{children}</main>
      <Footer />
      <MobileTabBar />
    </div>
  );
}