import { motion } from "framer-motion";
import { ReactNode } from "react";

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  priority?: "high" | "medium" | "low";
  delay?: number;
}

const priorityStyles = {
  high: {
    shadow: "0 30px 80px -20px hsl(var(--primary) / 0.15), 0 0 0 1px hsl(var(--primary) / 0.1)",
    scale: 1.02,
    glow: "hsl(var(--primary) / 0.08)",
  },
  medium: {
    shadow: "0 20px 60px -15px hsl(var(--foreground) / 0.1), 0 0 0 1px hsl(var(--border))",
    scale: 1.01,
    glow: "hsl(var(--foreground) / 0.03)",
  },
  low: {
    shadow: "0 15px 40px -10px hsl(var(--foreground) / 0.08), 0 0 0 1px hsl(var(--border))",
    scale: 1.005,
    glow: "transparent",
  },
};

export function BentoCard({ children, className = "", priority = "low", delay = 0 }: BentoCardProps) {
  const style = priorityStyles[priority];

  return (
    <motion.div
      className={`group relative overflow-hidden rounded-2xl border border-border bg-card backdrop-blur-md transition-colors hover:border-border ${className}`}
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      whileHover={{
        scale: style.scale,
        boxShadow: style.shadow,
        y: priority === "high" ? -8 : priority === "medium" ? -4 : -2,
      }}
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Subtle gradient bg */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(circle at 50% 50%, ${style.glow}, transparent 70%)` }}
      />
      <div className="relative z-10 p-6">{children}</div>
    </motion.div>
  );
}
