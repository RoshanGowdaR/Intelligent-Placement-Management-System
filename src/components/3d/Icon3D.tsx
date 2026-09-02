import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface Icon3DProps {
  icon: LucideIcon;
  color?: "blue" | "violet" | "orange" | "emerald";
  size?: "sm" | "md" | "lg";
}

const colorMap = {
  blue: {
    gradient: "linear-gradient(135deg, hsl(220 80% 55%), hsl(220 80% 45%))",
    shadow: "0 12px 30px -8px hsl(220 80% 50% / 0.4)",
    glow: "hsl(220 80% 50% / 0.2)",
  },
  violet: {
    gradient: "linear-gradient(135deg, hsl(260 70% 60%), hsl(260 70% 48%))",
    shadow: "0 12px 30px -8px hsl(260 70% 55% / 0.4)",
    glow: "hsl(260 70% 55% / 0.2)",
  },
  orange: {
    gradient: "linear-gradient(135deg, hsl(24 100% 55%), hsl(24 100% 45%))",
    shadow: "0 12px 30px -8px hsl(24 100% 50% / 0.4)",
    glow: "hsl(24 100% 50% / 0.2)",
  },
  emerald: {
    gradient: "linear-gradient(135deg, hsl(160 72% 45%), hsl(160 72% 35%))",
    shadow: "0 12px 30px -8px hsl(160 72% 40% / 0.4)",
    glow: "hsl(160 72% 40% / 0.2)",
  },
};

const sizeMap = {
  sm: { container: "h-10 w-10", icon: "h-5 w-5", rounded: "rounded-xl" },
  md: { container: "h-14 w-14", icon: "h-7 w-7", rounded: "rounded-2xl" },
  lg: { container: "h-16 w-16", icon: "h-8 w-8", rounded: "rounded-2xl" },
};

export function Icon3D({ icon: Icon, color = "blue", size = "md" }: Icon3DProps) {
  const c = colorMap[color];
  const s = sizeMap[size];

  return (
    <motion.div
      className={`relative flex items-center justify-center ${s.container} ${s.rounded}`}
      style={{
        background: c.gradient,
        boxShadow: c.shadow,
        transformStyle: "preserve-3d",
      }}
      whileHover={{
        rotateY: 15,
        rotateX: -10,
        scale: 1.1,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Highlight */}
      <div
        className={`pointer-events-none absolute inset-0 ${s.rounded}`}
        style={{
          background: "linear-gradient(135deg, hsl(0 0% 100% / 0.25) 0%, transparent 50%)",
        }}
      />
      <Icon className={`${s.icon} text-white relative z-10`} />
    </motion.div>
  );
}
