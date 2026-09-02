import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

const stats = [
  { value: "1,248+", label: "Students Evaluated", sub: "100% automated parsing" },
  { value: "98.4%", label: "Placement Precision", sub: "Zero manual friction" },
  { value: "24/7", label: "Proctored Coverage", sub: "Full forensic logs" },
];

export function LandingCTA() {
  const navigate = useNavigate();

  return (
    <section id="cta" className="px-5 pb-12 md:px-16 relative z-10 max-w-7xl mx-auto">
      <div className="glass-panel relative overflow-hidden rounded-3xl p-8 md:p-14 border border-white/15 shadow-[0_30px_90px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.2)] bg-surface/70">
        
        {/* Glow ambient circle */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-secondary/15 blur-3xl" />

        <div className="relative z-10 grid grid-cols-1 gap-8 sm:grid-cols-3 border-b border-white/10 pb-10">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-1">
              <span className="font-display text-4xl lg:text-5xl font-bold text-white tracking-tight">
                {s.value}
              </span>
              <span className="label-caps text-primary text-xs font-semibold uppercase tracking-wider mt-1">
                {s.label}
              </span>
              <span className="text-xs text-muted-foreground">{s.sub}</span>
            </div>
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-start justify-between gap-6 pt-10 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
              Ready to automate your campus recruitment?
            </h2>
            <p className="mt-2 text-slate-300 text-sm max-w-xl">
              Onboard your cohort, publish placement opportunities, generate adaptive problem sets, and launch proctored assessments today.
            </p>
          </div>
          <button
            className="label-caps spring-transition flex items-center gap-2 rounded-xl bg-primary px-8 py-4 font-semibold text-white shadow-[0_0_30px_rgba(108,92,231,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
            onClick={() => navigate("/signup")}
          >
            <Sparkles className="h-4 w-4" /> Get Started Now <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
