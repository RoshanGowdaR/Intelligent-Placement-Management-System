export function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background transition-colors duration-300">
      {/* Top Left Primary Indigo Blob */}
      <div className="ambient-blob -left-20 -top-20 h-[650px] w-[650px] rounded-full bg-primary/10 dark:bg-[#6C5CE7]/25 blur-[120px]" />
      
      {/* Center Right Violet Blob */}
      <div
        className="ambient-blob -right-20 top-1/3 h-[550px] w-[550px] rounded-full bg-purple-600/10 dark:bg-[#5847D2]/20 blur-[100px]"
        style={{ animationDelay: "-6s" }}
      />
      
      {/* Bottom Center Subtle Lavender/Cyan Ambient glow */}
      <div
        className="ambient-blob bottom-[-100px] left-1/4 h-[600px] w-[600px] rounded-full bg-indigo-400/10 dark:bg-[#C6BFFF]/15 blur-[130px]"
        style={{ animationDelay: "-12s" }}
      />
    </div>
  );
}
