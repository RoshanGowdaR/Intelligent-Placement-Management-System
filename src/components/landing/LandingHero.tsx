import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Video, ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";

export function LandingHero() {
  const navigate = useNavigate();

  return (
    <section className="relative grid min-h-[720px] grid-cols-1 items-center gap-12 px-5 pt-32 pb-16 md:px-16 lg:grid-cols-12 max-w-7xl mx-auto">
      {/* Left Column: Hero Text & CTAs */}
      <motion.div
        className="z-10 flex flex-col gap-6 lg:col-span-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 backdrop-blur-xl w-fit">
          <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
          <p className="label-caps tracking-[0.18em] text-primary dark:text-accent-foreground text-xs font-semibold">
            Intelligent Placement Management System
          </p>
        </div>

        <h1 className="font-display text-[44px] font-extrabold leading-[1.05] tracking-[-0.02em] text-slate-900 dark:text-white sm:text-5xl lg:text-[60px]">
          Placements,
          <br />
          <span className="text-glow bg-gradient-to-r from-[#5b51d8] via-[#7c6aed] to-[#8277ff] dark:from-primary dark:via-[#a29bfe] dark:to-[#c6bfff] bg-clip-text text-transparent">
            run like a product
          </span>
        </h1>
        
        <p className="max-w-xl text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-300">
          Engineered for top institutions and recruiters. Automate eligibility matrices, deploy AI-synthesized problem sets, and conduct tamper-proof proctored evaluations with forensic precision.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row pt-2">
          <button
            className="label-caps spring-transition rounded-xl bg-[#5b51d8] hover:bg-[#4d43cc] px-8 py-4 font-semibold text-white shadow-[0_0_30px_rgba(91,81,216,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            onClick={() => navigate("/signup")}
          >
            Get Started Free
          </button>
          <a
            href="#features"
            className="label-caps spring-transition flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-center font-semibold text-slate-900 dark:text-white bg-slate-900/5 dark:bg-white/5 border border-slate-300 dark:border-white/15 hover:bg-slate-900/10 dark:hover:bg-white/10 hover:border-primary/50 transition-all"
          >
            <span>Explore System</span>
            <ArrowRight className="h-4 w-4 text-[#5b51d8]" />
          </a>
        </div>

        {/* Quick telemetry bar */}
        <div className="grid grid-cols-3 gap-4 border-t border-slate-200 dark:border-white/10 pt-6 mt-4">
          <div>
            <div className="font-display text-2xl font-bold text-slate-900 dark:text-white">99.8%</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Proctor Accuracy</div>
          </div>
          <div>
            <div className="font-display text-2xl font-bold text-[#5b51d8]">&lt; 1.2s</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Eligibility Routing</div>
          </div>
          <div>
            <div className="font-display text-2xl font-bold text-slate-900 dark:text-white">100%</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Audit Trail</div>
          </div>
        </div>
      </motion.div>

      {/* Right Column: 3D Isometric Render with Glass Framing */}
      <motion.div
        className="relative lg:col-span-6 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div className="relative w-full group">
          {/* Ambient Glow behind image */}
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-primary/30 to-secondary/20 blur-2xl opacity-70 group-hover:opacity-100 transition-opacity" />

          {/* 3D Container with Glass Highlights */}
          <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 dark:border-white/20 bg-slate-900 shadow-[0_30px_90px_rgba(0,0,0,0.45)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.85)] min-h-[300px] md:min-h-[420px] flex items-center justify-center">
            <img
              src="/ipms_hero_3d_dashboard.jpg"
              alt="Intelligent Placement Management System 3D Futuristic Telemetry Interface"
              className="w-full h-full object-cover min-h-[300px] md:min-h-[420px] transform group-hover:scale-[1.02] transition-transform duration-700 ease-out"
              loading="eager"
            />
            
            {/* Overlay status tag */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-full border border-emerald-500/40 bg-[#0a0a0f]/80 px-3 py-1 text-[11px] font-mono text-emerald-400 backdrop-blur-md">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span>v3.0 ELITE ENGINE READY</span>
            </div>

            {/* Bottom Live Proctoring Chip */}
            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0a0a0f]/90 p-3 shadow-2xl backdrop-blur-xl">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-destructive/20 text-destructive">
                <Video className="h-4 w-4 animate-pulse" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-semibold text-white flex items-center gap-1">
                  AI Proctoring Active
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </p>
                <p className="text-[9px] text-slate-400">0 anomalies • Multi-face detection ON</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
