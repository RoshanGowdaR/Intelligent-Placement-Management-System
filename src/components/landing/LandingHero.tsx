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
          <p className="label-caps tracking-[0.18em] text-accent-foreground text-xs font-semibold">
            Intelligent Placement Management System
          </p>
        </div>

        <h1 className="font-display text-[44px] font-bold leading-[1.05] tracking-[-0.02em] text-white sm:text-5xl lg:text-[60px]">
          Placements,
          <br />
          <span className="text-glow bg-gradient-to-r from-primary via-[#a29bfe] to-[#c6bfff] bg-clip-text text-transparent">
            run like a product
          </span>
        </h1>
        
        <p className="max-w-xl text-lg leading-relaxed text-slate-200">
          Engineered for top institutions and recruiters. Automate eligibility matrices, deploy AI-synthesized problem sets, and conduct tamper-proof proctored evaluations with forensic precision.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row pt-2">
          <button
            className="label-caps spring-transition rounded-xl bg-primary px-8 py-4 font-semibold text-white shadow-[0_0_30px_rgba(108,92,231,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all"
            onClick={() => navigate("/signup")}
          >
            Get Started Free
          </button>
          <a
            href="#features"
            className="label-caps glass-button spring-transition flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-center text-white hover:bg-white/10 hover:border-primary/50"
          >
            Explore System <ArrowRight className="h-4 w-4 text-primary" />
          </a>
        </div>

        {/* Quick telemetry bar */}
        <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6 mt-4">
          <div>
            <div className="font-display text-2xl font-bold text-white">99.8%</div>
            <div className="text-xs text-slate-400">Proctor Accuracy</div>
          </div>
          <div>
            <div className="font-display text-2xl font-bold text-primary">&lt; 1.2s</div>
            <div className="text-xs text-slate-400">Eligibility Routing</div>
          </div>
          <div>
            <div className="font-display text-2xl font-bold text-white">100%</div>
            <div className="text-xs text-slate-400">Audit Trail</div>
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
          <div className="relative rounded-3xl overflow-hidden border border-white/20 bg-surface-container-lowest/80 shadow-[0_30px_90px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur-2xl">
            
            {/* Top Spotlight Glass Bar */}
            <div className="absolute top-0 inset-x-0 h-10 bg-gradient-to-b from-white/15 to-transparent pointer-events-none z-20" />
            
            {/* The 3D Render Image */}
            <img
              src="/ipms_hero_3d_dashboard.jpg"
              alt="Intelligent Placement Management System 3D Isometric Dashboard"
              className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
            />

            {/* Floating Live Proctoring Telemetry Pill */}
            <div className="absolute bottom-4 right-4 z-30 flex items-center gap-3 rounded-2xl border border-primary/40 bg-[#0A0A0F]/90 px-4 py-3 shadow-[0_15px_40px_rgba(108,92,231,0.4)] backdrop-blur-3xl">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/20 border border-destructive/40">
                <Video className="h-5 w-5 text-destructive" />
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-ping rounded-full bg-destructive" />
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-destructive" />
              </div>
              <div>
                <div className="font-display text-xs font-bold text-white flex items-center gap-1.5">
                  AI Proctoring Active <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <div className="text-[11px] text-slate-300">0 anomalies • Multi-face detection ON</div>
              </div>
            </div>

            {/* Floating Top-Left Status Badge */}
            <div className="absolute top-4 left-4 z-30 hidden sm:flex items-center gap-2 rounded-xl border border-white/20 bg-[#0A0A0F]/80 px-3 py-1.5 backdrop-blur-xl shadow-lg">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-semibold text-white font-mono">v3.0 ELITE ENGINE READY</span>
            </div>

          </div>
        </div>
      </motion.div>
    </section>
  );
}
