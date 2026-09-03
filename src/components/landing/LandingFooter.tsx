import { Linkedin, Twitter, Instagram, Github, Mail, Phone, Globe, Sparkles } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="relative z-10 mt-24 border-t border-border/40 bg-card text-foreground">
      
      {/* Main Multi-Column Grid matching Image 1 */}
      <div className="max-w-7xl mx-auto px-6 md:px-16 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
        
        {/* Column 1: Brand & Mission & Socials (2 cols on large) */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5b51d8] text-white shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-lg font-bold tracking-tight text-foreground">
                Intelligent Placement Management System
              </div>
              <div className="text-[10px] font-bold tracking-widest text-[#5b51d8] uppercase">
                IPMS ELITE
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
            IPMS empowers educational institutions, recruiters, and innovators with secure, scalable, and globally trusted placement solutions. We build confidence through excellence, precision, and innovation.
          </p>

          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block">
              FOLLOW US
            </span>
            <div className="flex items-center gap-2">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="h-9 w-9 rounded-xl bg-muted/60 hover:bg-[#5b51d8] hover:text-white text-muted-foreground flex items-center justify-center transition-colors"
              >
                <Linkedin className="h-4 w-4" />
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Twitter / X"
                className="h-9 w-9 rounded-xl bg-muted/60 hover:bg-[#5b51d8] hover:text-white text-muted-foreground flex items-center justify-center transition-colors"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="h-9 w-9 rounded-xl bg-muted/60 hover:bg-[#5b51d8] hover:text-white text-muted-foreground flex items-center justify-center transition-colors"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="h-9 w-9 rounded-xl bg-muted/60 hover:bg-[#5b51d8] hover:text-white text-muted-foreground flex items-center justify-center transition-colors"
              >
                <Github className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Column 2: Products & Contact Info */}
        <div className="space-y-6 text-xs">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-[#5b51d8] mb-3">
              <span className="h-2 w-0.5 bg-[#5b51d8]" /> PRODUCTS
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground transition-colors">HackathonHub</a></li>
              <li><a href="#features" className="hover:text-foreground transition-colors">Hirreio</a></li>
              <li><a href="#features" className="hover:text-foreground transition-colors">IPMS Learning</a></li>
              <li><a href="#features" className="hover:text-foreground transition-colors">Enterprise Suite</a></li>
            </ul>
          </div>

          <div className="pt-2">
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-[#5b51d8] mb-3">
              <span className="h-2 w-0.5 bg-[#5b51d8]" /> CONTACT INFO
            </div>
            <div className="space-y-2 text-muted-foreground">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/30 border border-border/40">
                <Mail className="h-4 w-4 text-[#5b51d8] shrink-0" />
                <span className="truncate">support@ipms.edu</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/30 border border-border/40">
                <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>+91 82499 25623</span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Solutions & Services */}
        <div className="text-xs">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-[#5b51d8] mb-3">
            <span className="h-2 w-0.5 bg-[#5b51d8]" /> SOLUTIONS &amp; SERVICES
          </div>
          <ul className="space-y-2 text-muted-foreground">
            <li><a href="#features" className="hover:text-foreground transition-colors">Software Development</a></li>
            <li><a href="#features" className="hover:text-foreground transition-colors">AI &amp; Machine Learning</a></li>
            <li><a href="#features" className="hover:text-foreground transition-colors">Web Development</a></li>
            <li><a href="#features" className="hover:text-foreground transition-colors">Mobile Development</a></li>
            <li><a href="#features" className="hover:text-foreground transition-colors">Data &amp; Analytics</a></li>
            <li><a href="#team" className="hover:text-foreground transition-colors">About IPMS</a></li>
            <li><a href="#features" className="hover:text-foreground transition-colors">Careers</a></li>
          </ul>
        </div>

        {/* Column 4: Legal & Resources */}
        <div className="text-xs space-y-4">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-[#5b51d8] mb-3">
              <span className="h-2 w-0.5 bg-[#5b51d8]" /> LEGAL &amp; RESOURCES
            </div>
            <div className="text-[11px] font-bold text-foreground mb-1.5">Legal</div>
            <ul className="space-y-1.5 text-muted-foreground">
              <li><a href="#cta" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
              <li><a href="#cta" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              <li><a href="#cta" className="hover:text-foreground transition-colors">Cookie Policy</a></li>
              <li><a href="#cta" className="hover:text-foreground transition-colors">Refund Policy</a></li>
            </ul>
          </div>

          <div>
            <div className="text-[11px] font-bold text-foreground mb-1.5">Resources</div>
            <ul className="space-y-1.5 text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground transition-colors">Insights &amp; Research</a></li>
              <li><a href="#features" className="hover:text-foreground transition-colors">FAQs</a></li>
              <li><a href="#cta" className="hover:text-foreground transition-colors">Contact Support</a></li>
              <li><a href="#cta" className="hover:text-foreground transition-colors">Compliance &amp; Ethics</a></li>
            </ul>
          </div>
        </div>

      </div>

      {/* Bottom Global Presence Section matching Image 1 */}
      <div className="border-t border-border/40 py-10 px-6 md:px-16 bg-muted/20">
        <div className="max-w-7xl mx-auto space-y-6 text-center">
          <div>
            <h4 className="font-display text-base font-bold text-foreground">Global Presence</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Professional services delivered with local expertise across continents
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="p-3.5 rounded-2xl bg-card border border-border/60 text-xs font-semibold text-foreground flex items-center justify-center gap-2 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span>Bangalore, India</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-card border border-border/60 text-xs font-semibold text-foreground flex items-center justify-center gap-2 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Bhubaneswar, India</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-card border border-border/60 text-xs font-semibold text-foreground flex items-center justify-center gap-2 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Singapore</span>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground pt-4 border-t border-border/30">
            © {new Date().getFullYear()} Intelligent Placement Management System (IPMS Elite). All rights reserved.
          </div>
        </div>
      </div>

    </footer>
  );
}
