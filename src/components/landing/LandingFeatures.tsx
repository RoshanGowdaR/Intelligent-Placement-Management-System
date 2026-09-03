import { BrainCircuit, FileCheck2, Megaphone, ShieldCheck, Lock, Activity, Cpu } from "lucide-react";

export function LandingFeatures() {
  return (
    <section id="features" className="flex flex-col gap-12 px-5 py-24 md:px-16 relative z-10 max-w-7xl mx-auto">
      <div className="text-center">
        <span className="label-caps tracking-[0.2em] text-[#5b51d8] text-xs uppercase font-bold">
          Platform Architecture
        </span>
        <h2 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl mt-2">
          Engineered Core Capabilities
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600 dark:text-slate-300 text-sm sm:text-base">
          A coherent, forensics-grade operating environment for academic placements, technical evaluations, and offer logistics.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Card 1 (Large 2-column) */}
        <article className="group flex flex-col justify-between rounded-3xl p-8 md:col-span-2 bg-card border border-slate-200/80 dark:border-white/10 hover:border-[#5b51d8]/50 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="label-caps text-[#5b51d8] uppercase tracking-widest text-xs font-bold block mb-2">
                Automated Matrix
              </span>
              <h3 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
                Eligibility Routing Engine
              </h3>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5b51d8]/10 border border-[#5b51d8]/30 shadow-sm group-hover:scale-110 transition-transform shrink-0">
              <FileCheck2 className="h-7 w-7 text-[#5b51d8]" />
            </div>
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
            Intelligent parsing protocols instantly categorize, filter, and route candidates based on multi-variable criteria: CGPA thresholds, backlogs, branch matrix configurations, and custom skill badges.
          </p>
        </article>

        {/* Card 2 */}
        <article className="group flex flex-col justify-between rounded-3xl p-8 bg-card border border-slate-200/80 dark:border-white/10 hover:border-destructive/40 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl">
          <div className="mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 border border-destructive/20 mb-5 shrink-0">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="font-display text-xl font-extrabold text-slate-900 dark:text-white">Secure Assessments</h3>
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            Tamper-proof fullscreen lockdown, multi-face webcam detection, and tab-switch prevention for high-stakes evaluations.
          </p>
        </article>

        {/* Card 3 */}
        <article className="group flex flex-col justify-between rounded-3xl p-8 bg-card border border-slate-200/80 dark:border-white/10 hover:border-amber-500/40 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl">
          <div className="mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 mb-5 shrink-0">
              <Cpu className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="font-display text-xl font-extrabold text-slate-900 dark:text-white">AI Question Synthesis</h3>
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            Dynamically synthesized problem sets tailored to candidate skill velocity and syllabus specifications without leakage risk.
          </p>
        </article>

        {/* Card 4 (Large 2-column with decorative progress bar) */}
        <article className="group flex flex-col justify-between rounded-3xl p-8 md:col-span-2 bg-card border border-slate-200/80 dark:border-white/10 hover:border-[#5b51d8]/50 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="label-caps text-[#5b51d8] uppercase tracking-widest text-xs font-bold block mb-2">
                Real-Time Telemetry
              </span>
              <h3 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
                Instantaneous Drive Updates
              </h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-lg">
                Pipeline velocity metrics, proctor logs, and multi-channel notifications (in-app + automated email) delivered over low-latency connections.
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-sm group-hover:scale-110 transition-transform shrink-0">
              <Activity className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>

          {/* Decorative pulse track */}
          <div className="mt-4 h-2.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden relative">
            <div className="h-full bg-gradient-to-r from-[#5b51d8] to-indigo-400 w-2/5 rounded-full relative shadow-[0_0_15px_#5b51d8]">
              <div className="absolute right-0 top-0 bottom-0 w-6 bg-white/70 blur-[2px] rounded-full animate-pulse" />
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
