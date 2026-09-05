import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Search, Users, ShieldCheck, Building2, GraduationCap,
  Filter, CheckCircle2, UserCheck, Shield, ChevronDown
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

interface AccountUser {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin" | "company";
  branch: string;
  cgpa: number | null;
  year_of_passing: number | null;
  profile_completion_percentage: number;
  usn?: string | null;
  created_at?: string;
}

export default function AdminStudents() {
  const [usersList, setUsersList] = useState<AccountUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "admin" | "company">("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [profilesRes, rolesRes, companiesRes] = await Promise.all([
          supabase.from("profiles").select("*").order("created_at", { ascending: false }),
          supabase.from("user_roles").select("*"),
          supabase.from("companies").select("*"),
        ]);

        const profiles = profilesRes.data ?? [];
        const roles = rolesRes.data ?? [];
        const companies = companiesRes.data ?? [];

        // Build mapping of user_id -> role
        const roleMap: Record<string, "admin" | "company" | "student"> = {};
        const emailRoleMap: Record<string, "admin" | "company" | "student"> = {};
        roles.forEach((r: any) => {
          if (r.user_id) roleMap[r.user_id] = r.role;
          if (r.email) emailRoleMap[r.email.toLowerCase()] = r.role;
        });

        // Identify company users
        const companyUserIds = new Set<string>();
        companies.forEach((c: any) => {
          if (c.user_id) companyUserIds.add(c.user_id);
        });

        const combined: AccountUser[] = [];
        const seenUserIds = new Set<string>();

        // 1. Process all profiles
        profiles.forEach((p) => {
          seenUserIds.add(p.id);
          let assignedRole: "student" | "admin" | "company" = "student";
          if (roleMap[p.id]) {
            assignedRole = roleMap[p.id];
          } else if (p.email && emailRoleMap[p.email.toLowerCase()]) {
            assignedRole = emailRoleMap[p.email.toLowerCase()];
          } else if (companyUserIds.has(p.id)) {
            assignedRole = "company";
          }

          // In case the admin registered under this email
          if (p.email?.toLowerCase() === "gowdaroshan49@gmail.com") {
            assignedRole = "admin";
          }

          combined.push({
            id: p.id,
            name: p.name || "Unnamed User",
            email: p.email || "—",
            role: assignedRole,
            branch: assignedRole === "admin" ? "Placement Administration" : assignedRole === "company" ? "Recruitment Division" : (p.branch || "Not Specified"),
            cgpa: assignedRole === "student" ? p.cgpa : null,
            year_of_passing: assignedRole === "student" ? p.year_of_passing : null,
            profile_completion_percentage: p.profile_completion_percentage ?? 0,
            usn: p.usn,
            created_at: p.created_at,
          });
        });

        // 2. Add any roles not having a profile (e.g. freshly invited companies or direct admins)
        roles.forEach((r: any) => {
          if (r.user_id && !seenUserIds.has(r.user_id)) {
            seenUserIds.add(r.user_id);
            combined.push({
              id: r.user_id,
              name: r.role === "company" ? "Enterprise Recruiter" : r.role === "admin" ? "Placement Admin" : "Student",
              email: r.email || "—",
              role: r.role,
              branch: r.role === "admin" ? "Placement Administration" : r.role === "company" ? "Recruitment Division" : "Not Specified",
              cgpa: null,
              year_of_passing: null,
              profile_completion_percentage: 100,
              created_at: r.created_at,
            });
          }
        });

        setUsersList(combined);
      } catch (err) {
        console.error("Failed fetching user accounts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Compute branches for filter dropdown
  const distinctBranches = Array.from(
    new Set(
      usersList
        .filter((u) => u.role === "student" && u.branch && u.branch !== "Not Specified")
        .map((u) => u.branch)
    )
  );

  const studentCount = usersList.filter((u) => u.role === "student").length;
  const adminCount = usersList.filter((u) => u.role === "admin").length;
  const companyCount = usersList.filter((u) => u.role === "company").length;

  const filtered = usersList.filter((u) => {
    // Role filter
    if (roleFilter !== "all" && u.role !== roleFilter) return false;

    // Branch filter
    if (branchFilter !== "all" && u.branch !== branchFilter) return false;

    // Search query
    const term = search.toLowerCase().trim();
    if (!term) return true;

    return (
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.branch.toLowerCase().includes(term) ||
      (u.usn && u.usn.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Header Banner */}
      <div className="rounded-3xl bg-card border border-border/80 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 md:p-8">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-primary">
            <Users className="h-3.5 w-3.5" />
            <span>Identity Directory &amp; Role Management</span>
          </div>

          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            User Accounts &amp; Candidates
          </h1>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Filter, inspect, and manage verified students, placement cell administrators, and visiting enterprise recruiter profiles.
          </p>
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-3 shrink-0 font-mono">
          <div className="p-3 rounded-2xl bg-card border border-border text-center min-w-[80px] shadow-sm">
            <div className="font-display text-xl font-bold text-foreground">{usersList.length}</div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Total</div>
          </div>

          <div className="p-3 rounded-2xl bg-card border border-border text-center min-w-[80px] shadow-sm">
            <div className="font-display text-xl font-bold text-emerald-600 dark:text-emerald-400">{studentCount}</div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Students</div>
          </div>

          <div className="p-3 rounded-2xl bg-card border border-border text-center min-w-[80px] shadow-sm">
            <div className="font-display text-xl font-bold text-purple-600 dark:text-purple-400">{adminCount}</div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Admins</div>
          </div>

          <div className="p-3 rounded-2xl bg-card border border-border text-center min-w-[80px] shadow-sm">
            <div className="font-display text-xl font-bold text-blue-600 dark:text-blue-400">{companyCount}</div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Companies</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, branch, or USN..."
            className="pl-10 h-10 rounded-2xl bg-card border-border/80 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Role Filter Pills */}
          <Button
            size="sm"
            onClick={() => setRoleFilter("all")}
            className={`rounded-xl text-xs font-bold h-9 px-3.5 ${
              roleFilter === "all" ? "bg-[#5b51d8] text-white" : "bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            All Accounts ({usersList.length})
          </Button>

          <Button
            size="sm"
            onClick={() => setRoleFilter("student")}
            className={`rounded-xl text-xs font-bold h-9 px-3.5 ${
              roleFilter === "student" ? "bg-[#5b51d8] text-white" : "bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5 mr-1" />
            Students ({studentCount})
          </Button>

          <Button
            size="sm"
            onClick={() => setRoleFilter("admin")}
            className={`rounded-xl text-xs font-bold h-9 px-3.5 ${
              roleFilter === "admin" ? "bg-[#5b51d8] text-white" : "bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Shield className="h-3.5 w-3.5 mr-1 text-purple-400" />
            Admins ({adminCount})
          </Button>

          <Button
            size="sm"
            onClick={() => setRoleFilter("company")}
            className={`rounded-xl text-xs font-bold h-9 px-3.5 ${
              roleFilter === "company" ? "bg-[#5b51d8] text-white" : "bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="h-3.5 w-3.5 mr-1 text-blue-400" />
            Companies ({companyCount})
          </Button>

          {/* Branch Filter (when viewing students or all) */}
          {distinctBranches.length > 0 && roleFilter !== "admin" && roleFilter !== "company" && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-9 rounded-xl bg-card border border-border/80 px-3 text-xs font-medium text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#5b51d8]"
            >
              <option value="all">All Branches</option>
              {distinctBranches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          )}

        </div>
      </div>

      {/* Main Accounts Table */}
      <Card className="rounded-3xl border-border/70 overflow-hidden shadow-sm bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/60">
                <TableHead className="text-xs font-bold uppercase tracking-wider py-4 pl-6">Name / Account</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider py-4">Role</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider py-4">Branch / Department</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider py-4">CGPA</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider py-4">Year</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider py-4 pr-6 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => {
                const isAdmin = u.role === "admin";
                const isCompany = u.role === "company";
                const isStudent = u.role === "student";

                return (
                  <TableRow key={u.id} className="border-border/40 hover:bg-muted/30 transition-colors">
                    
                    {/* User Identity */}
                    <TableCell className="py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isAdmin
                              ? "bg-purple-600/15 text-purple-600 border border-purple-600/30"
                              : isCompany
                              ? "bg-blue-600/15 text-blue-600 border border-blue-600/30"
                              : "bg-[#5b51d8]/15 text-[#5b51d8] border border-[#5b51d8]/30"
                          }`}
                        >
                          {isAdmin ? "AD" : isCompany ? "CO" : u.name ? u.name.charAt(0).toUpperCase() : "S"}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {u.usn && (
                              <span className="text-[10px] font-mono font-medium text-muted-foreground">
                                ({u.usn})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Role Badge */}
                    <TableCell className="py-4">
                      {isAdmin ? (
                        <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30 text-[10px] font-extrabold uppercase tracking-wide gap-1">
                          <Shield className="h-3 w-3" /> Admin
                        </Badge>
                      ) : isCompany ? (
                        <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px] font-extrabold uppercase tracking-wide gap-1">
                          <Building2 className="h-3 w-3" /> Recruiter
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wide gap-1">
                          <GraduationCap className="h-3 w-3" /> Student
                        </Badge>
                      )}
                    </TableCell>

                    {/* Branch / Department */}
                    <TableCell className="py-4 font-medium text-xs text-foreground">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1.5 font-bold text-purple-600 dark:text-purple-400">
                          <span>Placement Admin</span>
                        </span>
                      ) : isCompany ? (
                        <span className="inline-flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
                          <span>Recruiter Account</span>
                        </span>
                      ) : (
                        <span className={u.branch === "Not Specified" ? "text-muted-foreground" : "font-semibold"}>
                          {u.branch}
                        </span>
                      )}
                    </TableCell>

                    {/* CGPA */}
                    <TableCell className="py-4 font-mono text-xs">
                      {isStudent ? (
                        u.cgpa !== null ? (
                          <span className="font-bold text-foreground">{u.cgpa}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )
                      ) : (
                        <span className="text-muted-foreground text-[10px]">—</span>
                      )}
                    </TableCell>

                    {/* Passing Year */}
                    <TableCell className="py-4 font-mono text-xs">
                      {isStudent ? (
                        u.year_of_passing ? (
                          <span>{u.year_of_passing}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )
                      ) : (
                        <span className="text-muted-foreground text-[10px]">—</span>
                      )}
                    </TableCell>

                    {/* Profile Completion / Status */}
                    <TableCell className="py-4 pr-6 text-right">
                      {isStudent ? (
                        <Badge
                          variant={u.profile_completion_percentage >= 80 ? "default" : "secondary"}
                          className={`text-[10px] font-bold ${
                            u.profile_completion_percentage >= 80
                              ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                              : ""
                          }`}
                        >
                          {u.profile_completion_percentage}% Done
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-[10px] font-bold gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </Badge>
                      )}
                    </TableCell>

                  </TableRow>
                );
              })}

              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-xs">
                    No accounts matching your search and filter criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}
