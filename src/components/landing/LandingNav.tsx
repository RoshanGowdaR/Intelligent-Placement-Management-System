import { useNavigate } from "react-router-dom";
import { Bell, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const links = [
  { label: "Solutions", href: "#features" },
  { label: "Recruiters", href: "#features" },
  { label: "About Us", href: "#team" },
  { label: "Success Stories", href: "#cta" },
];

export function LandingNav() {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 z-50 flex h-20 w-full items-center justify-between border-b border-border/40 bg-card/80 px-5 backdrop-blur-2xl md:px-16 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-accent shadow-[0_0_20px_rgba(108,92,231,0.4)] border border-white/20">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="font-display text-lg font-bold tracking-tight text-foreground md:text-xl">
            Intelligent Placement Management System
          </div>
          <div className="text-[11px] font-medium tracking-widest text-primary uppercase">
            IPMS v3.0 Elite Edition
          </div>
        </div>
      </div>

      <nav className="hidden items-center gap-6 md:flex">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            className="label-caps text-muted-foreground transition-colors hover:text-foreground font-semibold text-xs"
          >
            {l.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        {/* Toggle Mode on Landing Page */}
        <ThemeToggle />

        <button
          className="label-caps hidden text-muted-foreground transition-colors hover:text-foreground md:block text-xs font-semibold px-3 py-2"
          onClick={() => navigate("/login")}
        >
          Log In
        </button>
        <button
          className="label-caps rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-md hover:opacity-90 transition-opacity"
          onClick={() => navigate("/signup")}
        >
          Get Started
        </button>
      </div>
    </header>
  );
}
