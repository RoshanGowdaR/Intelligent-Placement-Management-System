import { BrainCircuit, FileCheck2, Megaphone, ShieldCheck, Lock, Activity, Cpu } from "lucide-react";

export function LandingFeatures() {
  return (
    <section id="features" className="flex flex-col gap-12 px-5 py-24 md:px-16 relative z-10 max-w-7xl mx-auto">
      <div className="text-center">
        <span className="label-caps tracking-[0.2em] text-primary text-xs uppercase font-bold">
          Platform Architecture
        </span>
        <h2 className="font-display text-3xl font-bold text-white sm:text-4xl mt-2">
          Engineered Core Capabilities
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-slate-300">
          A coherent, forensics-grade operating environment for academic placements, technical evaluations, and offer logistics.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Card 1 (Large 2-column) */}
        <article className="glass-panel group flex flex-col justify-between rounded-2xl p-8 md:col-span-2 border border-white/10 hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="label-caps text-primary uppercase tracking-widest text-xs font-bold block mb-2">
                Automated Matrix
              </span>
              <h3 className="font-display text-2xl font-bold text-white">
                Eligibility Routing Engine
              </h3>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 border border-primary/40 shadow-[0_0_20px_rgba(108,92,231,0.4)] group-hover:scale-110 transition-transform">
              <FileCheck2 className="h-7 w-7 text-primary" />
            </div>
          </div>
          <p className="text-slate-300 text-base leading-relaxed max-w-xl">
            Intelligent parsing protocols instantly categorize, filter, and route candidates based on multi-variable criteria: CGPA thresholds, backlogs, branch matrix configurations, and custom skill badges.
          </p>
        </article>

        {/* Card 2 */}
        <article className="glass-panel group flex flex-col justify-between rounded-2xl p-8 border border-white/10 hover:border-destructive/40 transition-all duration-300 hover:-translate-y-1 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
          <div className="mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/20 border border-destructive/30 mb-5 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="font-display text-xl font-bold text-white">Secure Assessments</h3>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            Tamper-proof fullscreen lockdown, multi-face webcam detection, and tab-switch prevention for high-stakes evaluations.
          </p>
        </article>

        {/* Card 3 */}
        <article className="glass-panel group flex flex-col justify-between rounded-2xl p-8 border border-white/10 hover:border-tertiary/40 transition-all duration-300 hover:-translate-y-1 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
          <div className="mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-tertiary/20 border border-tertiary/30 mb-5 shadow-[0_0_20px_rgba(255,183,125,0.3)]">
              <Cpu className="h-6 w-6 text-tertiary" />
            </div>
            <h3 className="font-display text-xl font-bold text-white">AI Question Synthesis</h3>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            Dynamically synthesized problem sets tailored to candidate skill velocity and syllabus specifications without leakage risk.
          </p>
        </article>

        {/* Card 4 (Large 2-column with decorative progress bar) */}
        <article className="glass-panel group flex flex-col justify-between rounded-2xl p-8 md:col-span-2 border border-white/10 hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="label-caps text-accent-foreground uppercase tracking-widest text-xs font-bold block mb-2">
                Real-Time Telemetry
              </span>
              <h3 className="font-display text-2xl font-bold text-white mb-2">
                Instantaneous Drive Updates
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed max-w-lg">
                Pipeline velocity metrics, proctor logs, and multi-channel notifications (in-app + automated email) delivered over low-latency connections.
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/20 border border-secondary/30 shadow-[0_0_20px_rgba(198,191,255,0.3)] group-hover:scale-110 transition-transform">
              <Activity className="h-7 w-7 text-secondary" />
            </div>
          </div>

          {/* Decorative pulse track from Stitch screen */}
          <div className="mt-4 h-2.5 w-full bg-white/10 rounded-full overflow-hidden relative">
            <div className="h-full bg-gradient-to-r from-primary to-accent w-2/5 rounded-full relative shadow-[0_0_15px_#6c5ce7]">
              <div className="absolute right-0 top-0 bottom-0 w-6 bg-white/70 blur-[2px] rounded-full animate-pulse" />
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
