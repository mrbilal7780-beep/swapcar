import { Link } from "@tanstack/react-router";
import { Map, Compass, PlusSquare, MessageCircle, User } from "lucide-react";

const tabs = [
  { to: "/map", icon: Map, label: "Carte" },
  { to: "/explore", icon: Compass, label: "Explorer" },
  { to: "/create-post", icon: PlusSquare, label: "Post" },
  { to: "/chat", icon: MessageCircle, label: "Messages" },
  { to: "/profile", icon: User, label: "Profil" },
];

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-background/80 backdrop-blur-md"
      style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center justify-around max-w-2xl mx-auto">
        {tabs.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to as any}
            className="flex-1 py-3 px-2 flex flex-col items-center gap-0.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
            activeProps={{
              className:
                "flex-1 py-3 px-2 flex flex-col items-center gap-0.5 text-xs font-semibold text-primary transition",
            }}
          >
            <Icon className="w-6 h-6" />
            <span className="text-[10px]">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}