import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Linkedin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TeamMember {
  name: string;
  role: string;
  description?: string;
  image: string;
  linkedin: string;
}

const teamMembers: TeamMember[] = [
  {
    name: "Harsa Dash",
    role: "DEVELOPER TEAM LEAD",
    description: "Leading core placement architecture, microservices and automated proctoring telemetry.",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
    linkedin: "https://linkedin.com",
  },
  {
    name: "Salma Husna Salsabila",
    role: "UI/UX DESIGNER",
    description: "Creative designer crafting intuitive, user-centred interfaces that blend aesthetics with seamless functionality.",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80",
    linkedin: "https://linkedin.com",
  },
  {
    name: "Ritik Kumar",
    role: "SOFTWARE DEVELOPER",
    description: "Engineered high-throughput candidate assessment engines, question bank randomization & scoring.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80",
    linkedin: "https://linkedin.com",
  },
  {
    name: "Deepan Kumar Bishoyi",
    role: "OPERATION ANALYST",
    description: "Orchestrating company onboarding pipelines, campus registration workflows and recruiter operations.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80",
    linkedin: "https://linkedin.com",
  },
  {
    name: "Chandan Mishra",
    role: "DATA ANALYST",
    description: "Analyzing placement velocity, candidate telemetry percentiles and campus hiring insights.",
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=500&auto=format&fit=crop&q=80",
    linkedin: "https://linkedin.com",
  },
];

export function LandingTeam() {
  const [startIndex, setStartIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isPaused, setIsPaused] = useState(false);

  const prev = () => {
    setDirection(-1);
    setStartIndex((current) => (current === 0 ? teamMembers.length - 1 : current - 1));
  };

  const next = () => {
    setDirection(1);
    setStartIndex((current) => (current >= teamMembers.length - 1 ? 0 : current + 1));
  };

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setDirection(1);
      setStartIndex((current) => (current >= teamMembers.length - 1 ? 0 : current + 1));
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused, startIndex]);

  // Compute 3 visible members with wrap-around
  const visibleMembers: { member: TeamMember; key: string }[] = [];
  for (let i = 0; i < 3; i++) {
    const memberIndex = (startIndex + i) % teamMembers.length;
    visibleMembers.push({
      member: teamMembers[memberIndex],
      key: `${teamMembers[memberIndex].name}-${startIndex}-${i}`,
    });
  }

  return (
    <section id="team" className="py-20 px-5 md:px-16 max-w-7xl mx-auto relative">
      
      {/* Header Section */}
      <div className="text-center space-y-3 mb-14">
        <div className="inline-block">
          <span className="text-[10px] md:text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#5b51d8] bg-[#5b51d8]/10 border border-[#5b51d8]/20 px-3 py-1 rounded-full">
            OUR CORE LEADERSHIP
          </span>
        </div>
        
        <h2 className="font-display text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Meet Our <span className="text-[#5b51d8]">Visionaries</span>
        </h2>
        <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
          Passionate innovators building next-generation campus placement automation, proctored assessments, and recruiter ecosystems.
        </p>
      </div>

      {/* Carousel Container with Left/Right arrow controls */}
      <div
        className="relative"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        
        {/* Left Arrow Button */}
        <button
          onClick={prev}
          aria-label="Previous team members"
          className="absolute -left-4 md:-left-6 top-1/2 -translate-y-1/2 z-20 h-10 w-10 md:h-12 md:w-12 rounded-full bg-card border border-slate-200 dark:border-border/80 text-foreground shadow-lg flex items-center justify-center hover:bg-muted hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* 3 Team Cards Grid with Smooth Framer Motion Transition */}
        <div className="overflow-hidden py-2 px-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={startIndex}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="grid md:grid-cols-3 gap-6"
            >
              {visibleMembers.map(({ member }) => (
                <div
                  key={member.name}
                  className="rounded-3xl bg-card border border-slate-200/80 dark:border-border/70 overflow-hidden shadow-sm hover:shadow-xl hover:border-[#5b51d8]/40 transition-all duration-300 flex flex-col group"
                >
                  {/* Image Container */}
                  <div className="relative h-72 md:h-80 w-full overflow-hidden bg-muted/40">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Floating description banner */}
                    {member.description && (
                      <div className="absolute inset-x-3 bottom-3 p-3 rounded-2xl bg-black/80 backdrop-blur-md text-white text-[11px] leading-relaxed border border-white/15 shadow-md">
                        {member.description}
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Name, Role & LinkedIn */}
                  <div className="p-5 flex items-center justify-between gap-3 bg-card mt-auto border-t border-slate-100 dark:border-border/40">
                    <div>
                      <h3 className="font-display text-base font-extrabold text-slate-900 dark:text-white group-hover:text-[#5b51d8] transition-colors">
                        {member.name}
                      </h3>
                      <p className="text-[10px] font-bold tracking-wider uppercase text-[#5b51d8] mt-0.5">
                        {member.role}
                      </p>
                    </div>

                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${member.name} LinkedIn`}
                      className="h-8 w-8 rounded-xl bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white flex items-center justify-center transition-colors shrink-0"
                    >
                      <Linkedin className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={next}
          aria-label="Next team members"
          className="absolute -right-4 md:-right-6 top-1/2 -translate-y-1/2 z-20 h-10 w-10 md:h-12 md:w-12 rounded-full bg-card border border-slate-200 dark:border-border/80 text-foreground shadow-lg flex items-center justify-center hover:bg-muted hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Slide Indicator Dots */}
      <div className="flex items-center justify-center gap-2 mt-8">
        {teamMembers.map((_, idx) => (
          <button
            key={idx}
            onClick={() => {
              setDirection(idx > startIndex ? 1 : -1);
              setStartIndex(idx);
            }}
            aria-label={`Go to slide ${idx + 1}`}
            className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
              startIndex === idx
                ? "w-8 bg-[#5b51d8]"
                : "w-2 bg-slate-300 dark:bg-white/20 hover:bg-slate-400"
            }`}
          />
        ))}
      </div>

    </section>
  );
}
