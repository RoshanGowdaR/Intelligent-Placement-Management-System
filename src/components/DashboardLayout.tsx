import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
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
  GraduationCap, CalendarDays, Trophy, UserCircle, LogOut, Menu, Shield,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationCenter } from "@/components/NotificationCenter";
import { AnimatedBackground } from "@/components/3d/AnimatedBackground";

const adminLinks = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Companies", url: "/admin/companies", icon: Building2 },
  { title: "Tests", url: "/admin/tests", icon: ClipboardList },
  { title: "Students", url: "/admin/students", icon: Users },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Reports", url: "/admin/reports", icon: FileText },
  { title: "Leaderboard", url: "/admin/leaderboard", icon: Trophy },
  { title: "Security", url: "/admin/settings", icon: Shield },
];

const companyLinks = [
  { title: "Dashboard", url: "/company", icon: LayoutDashboard },
  { title: "Assessments", url: "/company/tests", icon: ClipboardList },
  { title: "Candidates", url: "/company/candidates", icon: Users },
  { title: "Drive Reports", url: "/company/reports", icon: FileText },
];

const studentLinks = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Companies", url: "/dashboard/companies", icon: Building2 },
  { title: "My Tests", url: "/dashboard/tests", icon: ClipboardList },
  { title: "Results", url: "/dashboard/results", icon: Trophy },
  { title: "Schedule", url: "/dashboard/schedule", icon: CalendarDays },
  { title: "Profile", url: "/dashboard/profile", icon: UserCircle },
];

function AppSidebar({ role }: { role: "admin" | "company" | "student" | null }) {
  const links = role === "admin" ? adminLinks : role === "company" ? companyLinks : studentLinks;
  const roleLabel = role === "admin" ? "Admin" : role === "company" ? "Company Recruiter" : "Student";

  return (
    <Sidebar className="border-r border-border/40 bg-sidebar/50 backdrop-blur-3xl">
      <SidebarContent className="bg-transparent">
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="skeuo-icon h-11 w-11 bg-primary text-primary-foreground shadow-[0_0_20px_rgba(108,92,231,0.5)]">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-[15px] font-bold tracking-tight text-foreground line-clamp-1">
              Intelligent Placement
            </div>
            <span className="text-xs font-semibold text-primary">IPMS Elite v3.0</span>
          </div>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel className="label-caps px-5 tracking-[0.15em] text-accent-foreground">
            {roleLabel}
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-2 px-3">
            <SidebarMenu className="gap-1">
              {links.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin" || item.url === "/company" || item.url === "/dashboard"}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-300 hover:bg-white/5 hover:text-foreground"
                      activeClassName="nav-pill-active font-semibold hover:bg-primary hover:text-primary-foreground"
                    >
                      <item.icon className="h-4 w-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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

  const handleSignOut = async () => { await signOut(); toast.success("Signed out"); };

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

  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen w-full bg-background">
        <AnimatedBackground />
        <AppSidebar role={role as any} />
        <div className="relative z-10 flex flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-border/40 bg-white/5 px-6 shadow-[0_1px_0_0_hsl(0_0%_100%/0.06)_inset] backdrop-blur-3xl">
            <SidebarTrigger><Menu className="h-5 w-5 text-muted-foreground" /></SidebarTrigger>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm font-medium text-muted-foreground sm:block">{user?.email}</span>
              <NotificationCenter />
              <ThemeToggle />
              <Button variant="ghost" size="sm" className="glass-button rounded-lg text-muted-foreground hover:text-accent-foreground" onClick={handleSignOut}>
                <LogOut className="mr-1.5 h-4 w-4" /> Sign out
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
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
