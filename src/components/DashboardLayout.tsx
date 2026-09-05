import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminSessionTimeout, getAdminResumeRoute, clearAdminResumeRoute } from "@/hooks/useSessionTimeout";
import { NavLink } from "@/components/NavLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  LayoutDashboard, Building2, FileText, Users, BarChart3, ClipboardList,
  GraduationCap, CalendarDays, Trophy, UserCircle, LogOut, Menu, Shield, GitBranch,
  Search, Sparkles, Settings, HelpCircle, ChevronDown, Bell, CheckCircle2, Lock, Bot,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationCenter } from "@/components/NotificationCenter";
import { AnimatedBackground } from "@/components/3d/AnimatedBackground";
import { StudentAIAssistant } from "@/components/assistant/StudentAIAssistant";

const adminLinks = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard },
  { title: "AI Assistant", url: "/admin/ai", icon: Bot },
  { title: "Companies", url: "/admin/companies", icon: Building2 },
  { title: "Assessments", url: "/admin/tests", icon: ClipboardList },
  { title: "Students", url: "/admin/students", icon: Users },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Reports", url: "/admin/reports", icon: FileText },
  { title: "Leaderboard", url: "/admin/leaderboard", icon: Trophy },
  { title: "Security", url: "/admin/settings", icon: Shield },
];

const companyLinks = [
  { title: "Overview", url: "/company", icon: LayoutDashboard },
  { title: "Placement AI", url: "/company/ai", icon: Bot },
  { title: "Drive Rounds", url: "/company/rounds", icon: GitBranch },
  { title: "Assessments", url: "/company/tests", icon: ClipboardList },
  { title: "Candidates", url: "/company/candidates", icon: Users },
  { title: "Drive Reports", url: "/company/reports", icon: FileText },
];

const studentLinks = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "AI Assistant", url: "/dashboard/ai", icon: Bot },
  { title: "Profile Studio", url: "/dashboard/profile", icon: UserCircle },
  { title: "Applications", url: "/dashboard/companies", icon: Building2 },
  { title: "My Assessments", url: "/dashboard/tests", icon: ClipboardList },
  { title: "Meetings", url: "/dashboard/meetings", icon: CalendarDays },
  { title: "Score Card", url: "/dashboard/scorecard", icon: Trophy },
  { title: "Notifications", url: "/dashboard/notifications", icon: Bell },
];

function AppSidebar({ role }: { role: "admin" | "company" | "student" | null }) {
  const links = role === "admin" ? adminLinks : role === "company" ? companyLinks : studentLinks;
  const roleLabel = role === "admin" ? "Placement Admin" : role === "company" ? "Recruiter Portal" : "Candidate Portal";
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
  };

  return (
    <Sidebar className="border-r border-border/40 bg-card/90 backdrop-blur-3xl">
      <SidebarContent className="flex flex-col justify-between h-full p-3 bg-transparent">
        <div>
          {/* Brand Logo matching Zidio style */}
          <div className="flex items-center gap-3 px-3 py-4 mb-2">
            <div className="h-9 w-9 rounded-xl bg-[#5b51d8] flex items-center justify-center text-white shadow-[0_4px_12px_rgba(91,81,216,0.4)]">
              <Sparkles className="h-5 w-5 fill-white" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-base font-extrabold tracking-tight text-foreground flex items-center gap-1.5">
                IPMS <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-[#5b51d8]/15 text-[#5b51d8]">ELITE</span>
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">Placement Management</span>
            </div>
          </div>

          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase font-bold tracking-[0.15em] text-muted-foreground px-3 mb-1">
              {roleLabel}
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-1">
              <SidebarMenu className="gap-1.5">
                {links.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/admin" || item.url === "/company" || item.url === "/dashboard"}
                        className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-muted-foreground transition-all duration-200 hover:bg-muted/70 hover:text-foreground"
                        activeClassName="bg-[#5b51d8] text-white font-bold hover:bg-[#5b51d8] hover:text-white shadow-[0_4px_14px_rgba(91,81,216,0.35)]"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        {/* Bottom Area: Logout button */}
        <div className="mt-auto px-1 pt-4 pb-2">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-muted/60 hover:bg-muted text-foreground border border-border/80 text-xs font-bold transition-all shadow-sm group"
          >
            <LogOut className="h-4 w-4 text-rose-500 group-hover:-translate-x-0.5 transition-transform" />
            <span>Log out</span>
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { role, signOut, user } = useAuth();
  const isAdmin = role === "admin";
  const navigate = useNavigate();
  const location = useLocation();

  const [forceResetOpen, setForceResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useAdminSessionTimeout();

  useEffect(() => {
    if (isAdmin) {
      const resumeRoute = getAdminResumeRoute();
      clearAdminResumeRoute();
      if (resumeRoute && resumeRoute !== "/admin" && resumeRoute !== window.location.pathname) {
        navigate(resumeRoute, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (new URLSearchParams(location.search).get("force_password_reset") === "1") setForceResetOpen(true);
  }, [location.search]);

  const handlePasswordUpdate = async () => {
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    setIsUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsUpdatingPassword(false);
    if (error) { toast.error(error.message); return; }
    const params = new URLSearchParams(location.search);
    params.delete("force_password_reset");
    toast.success("Password updated successfully");
    setForceResetOpen(false);
    setNewPassword(""); setConfirmPassword("");
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : "" }, { replace: true });
  };

  // Compute breadcrumb title from pathname
  const pathParts = location.pathname.split("/").filter(Boolean);
  const breadcrumbSection = pathParts[0] ? pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1) : "Dashboard";
  const breadcrumbPage = pathParts[1]
    ? pathParts[1].charAt(0).toUpperCase() + pathParts[1].slice(1).replace("-", " ")
    : "Overview";

  const userInitial = user?.email?.charAt(0).toUpperCase() || "A";
  const displayName = user?.user_metadata?.full_name || (user?.email ? user.email.split("@")[0] : "Candidate");

  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen w-full bg-background">
        <AnimatedBackground />
        <AppSidebar role={role as any} />
        
        <div className="relative z-10 flex flex-1 flex-col min-w-0">
          
          {/* Top Navbar Header matching Zidio */}
          <header className="flex h-16 items-center justify-between border-b border-border/40 bg-card/80 px-4 md:px-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] backdrop-blur-3xl gap-4">
            
            {/* Left: Sidebar trigger + Brand & Breadcrumb */}
            <div className="flex items-center gap-3 shrink-0">
              <SidebarTrigger>
                <Menu className="h-5 w-5 text-muted-foreground hover:text-foreground cursor-pointer" />
              </SidebarTrigger>

              <div className="hidden sm:flex items-center gap-2 text-xs">
                <div className="h-6 w-6 rounded-lg bg-[#5b51d8] flex items-center justify-center text-white">
                  <Sparkles className="h-3.5 w-3.5 fill-white" />
                </div>
                <span className="font-extrabold text-foreground tracking-tight">IPMS</span>
                <span className="text-muted-foreground">/</span>
                <span className="font-medium text-muted-foreground">{breadcrumbSection}</span>
                <span className="text-muted-foreground">/</span>
                <span className="font-bold text-foreground">{breadcrumbPage}</span>
              </div>
            </div>

            {/* Center: Global Search Bar */}
            <div className="hidden md:flex flex-1 max-w-md items-center relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search projects, tests, companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-12 text-xs rounded-xl bg-muted/40 border border-border/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-card border border-border text-muted-foreground">
                ⌘K
              </span>
            </div>

            {/* Right: Actions & User Pill */}
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <ThemeToggle />
              <NotificationCenter />

              <button
                onClick={() => navigate(role === "admin" ? "/admin/settings" : "/dashboard/profile")}
                className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>

              <button
                onClick={() => toast.info("Placement Support: Available Mon-Sat 9AM-7PM IST")}
                className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                title="Help"
              >
                <HelpCircle className="h-4 w-4" />
              </button>

              {/* User Profile Pill */}
              <Link
                to={role === "admin" ? "/admin/settings" : role === "company" ? "/company" : "/dashboard/profile"}
                className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-full bg-muted/40 hover:bg-muted/70 border border-border/60 transition-all cursor-pointer group"
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-[#5b51d8] to-[#8075ff] text-white font-extrabold flex items-center justify-center text-xs shadow-sm">
                  {userInitial}
                </div>
                <div className="hidden xl:flex flex-col text-left leading-tight">
                  <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors capitalize truncate max-w-[120px]">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                    {user?.email}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
              </Link>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
          {role === "student" && <StudentAIAssistant />}
        </div>
      </div>

      <Dialog open={forceResetOpen} onOpenChange={(open) => open && setForceResetOpen(true)}>
        <DialogContent
          className="rounded-2xl border border-border bg-card shadow-lg sm:max-w-md"
          onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-foreground">Set your new password</DialogTitle>
            <DialogDescription className="text-muted-foreground">For security, you must set a new password before continuing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recovery-new-password" className="text-muted-foreground text-xs uppercase tracking-wider">New password</Label>
              <Input id="recovery-new-password" type="password" placeholder="At least 6 characters"
                className="border-border bg-secondary text-foreground placeholder:text-muted-foreground"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recovery-confirm-password" className="text-muted-foreground text-xs uppercase tracking-wider">Confirm password</Label>
              <Input id="recovery-confirm-password" type="password" placeholder="Repeat your password"
                className="border-border bg-secondary text-foreground placeholder:text-muted-foreground"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} required />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full font-bold" onClick={handlePasswordUpdate} disabled={isUpdatingPassword}>
              {isUpdatingPassword ? "Updating…" : "Update password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
