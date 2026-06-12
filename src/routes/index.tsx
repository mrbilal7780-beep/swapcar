import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({ head: () => ({
    meta: [
      { title: "TORQUE — Premium Automotive Social Network" },
      { name: "description", content: "The world's premium automotive social network. Connect with car enthusiasts, share your builds, discover amazing vehicles." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user } = useAuth();

  if (user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 mx-auto mb-6 flex items-center justify-center">
            <span className="text-3xl font-black">T</span>
          </div>
          <h1 className="text-3xl font-black mb-2">Welcome to TORQUE</h1>
          <p className="text-muted-foreground mb-8">Redirecting to your feed...</p>
          <Link to="/feed" className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:bg-primary/90 transition">
            Go to Feed
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 text-foreground">
      <style>{`html { padding-top: max(0px, env(safe-area-inset-top)); padding-bottom: max(0px, env(safe-area-inset-bottom)); padding-left: max(0px, env(safe-area-inset-left)); padding-right: max(0px, env(safe-area-inset-right)); }`}</style>
      
      <section className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-2xl text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 mb-6">
            <span className="text-3xl font-black">T</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight mb-6 leading-tight">
            The World's Premium<br />
            <span className="text-gradient">Automotive</span><br />
            Social Network
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
            Connect with car enthusiasts worldwide. Share your builds, discover amazing vehicles, and join an exclusive community.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-12 sm:justify-center">
            <Link
              to="/login"
              className="px-8 py-4 bg-primary text-primary-foreground rounded-full font-semibold hover:bg-primary/90 transition active:scale-95 duration-150"
            >
              Get Started
            </Link>
            <button className="px-8 py-4 border border-white/20 rounded-full font-semibold hover:bg-white/5 transition active:scale-95 duration-150">
              Learn More
            </button>
          </div>

          <div className="flex justify-center gap-8 text-sm mb-16">
            <div>
              <div className="text-2xl font-black text-primary">50K+</div>
              <div className="text-muted-foreground">Members</div>
            </div>
            <div>
              <div className="text-2xl font-black text-primary">1M+</div>
              <div className="text-muted-foreground">Daily Posts</div>
            </div>
            <div>
              <div className="text-2xl font-black text-primary">180+</div>
              <div className="text-muted-foreground">Countries</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-black text-center mb-16">Why TORQUE?</h2>
          
          <div className="grid sm:grid-cols-2 gap-8">
            <FeatureCard
              title="Global Community"
              description="Connect with passionate car enthusiasts from around the world."
            />
            <FeatureCard
              title="Mobile First"
              description="Premium experience optimized for iPhone and Android."
            />
            <FeatureCard
              title="Curated Feed"
              description="AI-powered feed that shows you what matters most."
            />
            <FeatureCard
              title="Zero Latency"
              description="Real-time updates, instant notifications, pure speed."
            />
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center bg-gradient-to-r from-primary/10 to-primary/5 rounded-3xl p-12 border border-primary/20">
          <h2 className="text-3xl font-black mb-4">Ready to Join?</h2>
          <p className="text-muted-foreground mb-8">
            Create your account and start exploring the premium automotive social network today.
          </p>
          <Link
            to="/login"
            className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:bg-primary/90 transition"
          >
            Sign Up Now
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-primary/50 transition group">
      <div className="mb-4">
        <div className="w-3 h-3 rounded-full bg-primary" />
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
