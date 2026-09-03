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
    <section id="cta" className="px-5 pb-16 md:px-16 relative z-10 max-w-7xl mx-auto">
      <div className="relative overflow-hidden rounded-3xl p-8 md:p-14 border border-slate-200/80 dark:border-white/15 shadow-md dark:shadow-[0_30px_90px_rgba(0,0,0,0.8)] bg-card">
        
        {/* Glow ambient circles */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#5b51d8]/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10 grid grid-cols-1 gap-8 sm:grid-cols-3 border-b border-slate-200 dark:border-white/10 pb-10">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-1">
              <span className="font-display text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {s.value}
              </span>
              <span className="label-caps text-[#5b51d8] text-xs font-bold uppercase tracking-wider mt-1">
                {s.label}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{s.sub}</span>
            </div>
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-start justify-between gap-6 pt-10 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
              Ready to automate your campus recruitment?
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300 text-sm max-w-xl">
              Onboard your cohort, publish placement opportunities, generate adaptive problem sets, and launch proctored assessments today.
            </p>
          </div>
          <button
            className="label-caps spring-transition flex items-center gap-2 rounded-xl bg-[#5b51d8] hover:bg-[#4d43cc] px-8 py-4 font-semibold text-white shadow-[0_0_30px_rgba(91,81,216,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all whitespace-nowrap cursor-pointer"
            onClick={() => navigate("/signup")}
          >
            <Sparkles className="h-4 w-4" /> Get Started Now <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
