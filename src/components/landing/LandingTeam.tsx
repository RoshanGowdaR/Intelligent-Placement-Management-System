import { Linkedin } from "lucide-react";
import { motion } from "framer-motion";

interface TeamMember {
  name: string;
  role: string;
  description: string;
  image: string;
  objectPosition?: string;
  linkedin: string;
}

const teamMembers: TeamMember[] = [
  {
    name: "Roshan Gowda R M",
    role: "SOFTWARE DEVELOPER AND TEAM LEAD",
    description: "Leading core placement architecture, full-stack ecosystem engineering, and autonomous proctoring intelligence.",
    image: "/team/roshan-gowda.jpg",
    objectPosition: "center center",
    linkedin: "https://linkedin.com",
  },
  {
    name: "Hemanth Gowda B D",
    role: "SOFTWARE DEVELOPER",
    description: "Engineered candidate evaluation engines, test authoring workflows, and secure database telemetry.",
    image: "/team/hemanth-gowda.jpg",
    objectPosition: "center center",
    linkedin: "https://linkedin.com",
  },
  {
    name: "Druthika Y B",
    role: "FRONTEND DEVELOPER",
    description: "Designing dynamic analytics dashboards, recruiter onboarding flows, and seamless animated interactions.",
    image: "/team/druthika-yb.jpg",
    objectPosition: "top center",
    linkedin: "https://linkedin.com",
  },
  {
    name: "Disha N Jain",
    role: "FRONTEND DEVELOPER",
    description: "Crafting intuitive, accessible responsive interfaces, dark/light theme precision, and candidate experience.",
    image: "/team/disha-n-jain.jpg",
    objectPosition: "top center",
    linkedin: "https://linkedin.com",
  },
];

export function LandingTeam() {
  return (
    <section id="team" className="py-20 px-5 md:px-16 max-w-7xl mx-auto relative">
      {/* Header Section */}
      <div className="text-center space-y-3 mb-14">
        <div className="inline-block">
          <span className="text-[10px] md:text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#5b51d8] bg-[#5b51d8]/10 border border-[#5b51d8]/20 px-3.5 py-1.5 rounded-full">
            OUR CORE LEADERSHIP
          </span>
        </div>
        
        <h2 className="font-display text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Meet Our <span className="text-[#5b51d8]">Visionaries</span>
        </h2>
        <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          Passionate innovators from Malnad College of Engineering building next-generation campus placement automation, proctored assessments, and recruiter ecosystems.
        </p>
      </div>

      {/* 4 Team Cards Grid showcasing all members */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {teamMembers.map((member, idx) => (
          <motion.div
            key={member.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className="rounded-3xl bg-card border border-slate-200/80 dark:border-border/70 overflow-hidden shadow-sm hover:shadow-xl hover:border-[#5b51d8]/40 transition-all duration-300 flex flex-col group"
          >
            {/* Image Container with portrait aspect ratio */}
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center">
              <img
                src={member.image}
                alt={member.name}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                style={{ objectPosition: member.objectPosition || "center center" }}
              />

              {/* Initials Fallback if image fails */}
              <div className="absolute inset-0 flex flex-col items-center justify-center -z-0 pointer-events-none">
                <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-[#5b51d8] to-purple-600 text-white font-display text-2xl font-extrabold flex items-center justify-center shadow-lg">
                  {member.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <span className="text-xs font-semibold text-foreground/80 mt-2 font-display">{member.name}</span>
              </div>
            </div>

            {/* Card Body: Name, Role, Description & LinkedIn */}
            <div className="p-5 flex flex-col flex-grow bg-card border-t border-slate-100 dark:border-border/40">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-base font-extrabold text-slate-900 dark:text-white group-hover:text-[#5b51d8] transition-colors leading-snug">
                    {member.name}
                  </h3>
                  <p className="text-[10px] font-bold tracking-wider uppercase text-[#5b51d8] mt-1">
                    {member.role}
                  </p>
                </div>

                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${member.name} LinkedIn`}
                  className="h-8 w-8 rounded-xl bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white flex items-center justify-center transition-colors shrink-0 mt-0.5"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-3 flex-grow">
                {member.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
