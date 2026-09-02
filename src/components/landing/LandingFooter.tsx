export function LandingFooter() {
  return (
    <footer className="relative z-10 mt-24 flex w-full flex-col items-center justify-between gap-4 border-t border-white/10 bg-surface/90 px-5 py-12 backdrop-blur-2xl md:flex-row md:px-16">
      <div>
        <div className="font-display text-lg font-bold text-white">Intelligent Placement Management System</div>
        <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} Intelligent Placement Management System. Precision in Placement.</div>
      </div>
      <nav className="flex gap-6">
        <a className="label-caps text-muted-foreground transition-colors hover:text-accent-foreground" href="#features">
          Privacy Policy
        </a>
        <a className="label-caps text-muted-foreground transition-colors hover:text-accent-foreground" href="#features">
          Terms of Service
        </a>
        <a className="label-caps text-muted-foreground transition-colors hover:text-accent-foreground" href="#cta">
          Specifications
        </a>
      </nav>
    </footer>
  );
}
