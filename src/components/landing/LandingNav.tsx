import { useNavigate } from "react-router-dom";
import { Bell, Sparkles } from "lucide-react";

const links = [
  { label: "Solutions", href: "#features" },
  { label: "Recruiters", href: "#features" },
  { label: "Success Stories", href: "#cta" },
  { label: "Capabilities", href: "#features" },
];

export function LandingNav() {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 z-50 flex h-20 w-full items-center justify-between border-b border-white/10 bg-surface/80 px-5 backdrop-blur-2xl md:px-16 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-accent shadow-[0_0_20px_rgba(108,92,231,0.4)] border border-white/20">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="font-display text-lg font-bold tracking-tight text-white md:text-xl">
            Intelligent Placement Management System
          </div>
          <div className="text-[11px] font-medium tracking-widest text-primary/80 uppercase">
            IPMS v3.0 Elite Edition
          </div>
        </div>
      </div>

      <nav className="hidden items-center gap-6 md:flex">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            className="label-caps text-muted-foreground transition-colors hover:text-accent-foreground"
          >
            {l.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        <button
          aria-label="Notifications"
          className="glass-panel glass-panel-interactive hidden h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-all hover:text-accent-foreground md:flex"
        >
          <Bell className="h-4 w-4" />
        </button>
        <button
          className="label-caps hidden text-muted-foreground transition-colors hover:text-accent-foreground md:block"
          onClick={() => navigate("/login")}
        >
          Log In
        </button>
        <button
          className="label-caps spring-transition rounded-lg bg-primary px-6 py-3 text-primary-foreground shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] hover:scale-[0.97]"
          onClick={() => navigate("/signup")}
        >
          Get Started
        </button>
      </div>
    </header>
  );
}
