import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GlassCard } from "@/components/3d/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Search, CheckCircle2, XCircle, Award, ExternalLink, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CompanyCandidates() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("registered");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [eligibleRoster, setEligibleRoster] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCandidates();
  }, [user]);

  const fetchCandidates = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: comp } = await supabase
        .from("companies")
        .select("id, name")
        .eq("user_id", user.id)
        .maybeSingle();

      // 1. Fetch test attempts for tests belonging to this company
      let attemptsQuery = supabase
        .from("test_attempts")
        .select("id, total_score, passed, tab_switches, completed_at, profiles(name, email, usn, branch, cgpa, resume_url), tests(title, id)")
        .order("completed_at", { ascending: false });

      if (comp?.id) {
        attemptsQuery = attemptsQuery.or(`tests.created_by.eq.${user.id},tests.company_id.eq.${comp.id}`);
      }

      const { data: attemptsData } = await attemptsQuery;
      setCandidates(attemptsData ?? []);

      // 2. Fetch all student profiles for general eligible talent pool
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name, email, usn, branch, cgpa, skills, resume_url")
        .order("cgpa", { ascending: false });

      setEligibleRoster(profilesData ?? []);
    } catch (err: any) {
      console.error("Error fetching candidates:", err);
      toast.error("Failed to load candidate roster");
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    const text = `${c.profiles?.name || ""} ${c.profiles?.email || ""} ${c.profiles?.usn || ""} ${c.tests?.title || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const filteredRoster = eligibleRoster.filter((s) => {
    const text = `${s.name || ""} ${s.email || ""} ${s.usn || ""} ${s.branch || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-white">Candidate Roster</h1>
          <p className="text-sm text-slate-400">
            Review test submissions, evaluate candidate qualifications & explore campus talent pool.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, USN, branch…"
            className="pl-9 h-10 rounded-xl border-white/10 bg-white/5 text-white"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-2xl">
          <TabsTrigger value="registered" className="rounded-xl font-semibold data-[state=active]:bg-primary data-[state=active]:text-white">
            Assessment Submissions ({filteredCandidates.length})
          </TabsTrigger>
          <TabsTrigger value="all_eligible" className="rounded-xl font-semibold data-[state=active]:bg-primary data-[state=active]:text-white">
            Eligible Campus Talent Pool ({filteredRoster.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Assessment Submissions */}
        <TabsContent value="registered" className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-2" />
              Loading submissions…
            </div>
          ) : filteredCandidates.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-3 opacity-40" />
              <h3 className="font-display text-lg font-bold text-white">No candidate submissions found</h3>
              <p className="text-xs text-slate-400 mt-1">
                When students complete your scheduled assessments, their scores will appear here.
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {filteredCandidates.map((c) => (
                <GlassCard key={c.id} className="p-5 border-white/10 hover:border-primary/40 transition-colors">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-display text-base font-bold text-white">
                          {c.profiles?.name || c.profiles?.email || "Candidate"}
                        </span>
                        <Badge className="bg-white/10 text-slate-300 text-xs">
                          {c.profiles?.branch || "B.Tech"}
                        </Badge>
                        {c.profiles?.usn && (
                          <span className="text-xs font-mono text-slate-400">({c.profiles.usn})</span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400">
                        Assessment: <strong className="text-white">{c.tests?.title || "Test"}</strong> • CGPA: {c.profiles?.cgpa || "N/A"}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-mono text-lg font-extrabold text-white">{c.total_score}%</div>
                        <Badge className={c.passed ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]" : "bg-destructive/20 text-destructive text-[10px]"}>
                          {c.passed ? "Qualified" : "Below Cutoff"}
                        </Badge>
                      </div>

                      {c.profiles?.resume_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl glass-button text-xs gap-1.5"
                          onClick={() => window.open(c.profiles.resume_url, "_blank")}
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Resume
                        </Button>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: All Eligible Students */}
        <TabsContent value="all_eligible" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRoster.map((s) => (
              <GlassCard key={s.id} className="p-5 border-white/10 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display font-bold text-white text-base">{s.name || s.email}</h3>
                    <p className="text-xs text-slate-400">{s.branch || "General Engineering"} {s.usn ? `• ${s.usn}` : ""}</p>
                  </div>
                  <Badge className="bg-primary/20 text-primary font-mono text-xs">
                    {s.cgpa ? `${s.cgpa} CGPA` : "N/A"}
                  </Badge>
                </div>

                {s.skills && s.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {s.skills.slice(0, 3).map((skill: string) => (
                      <span key={skill} className="text-[10px] rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-slate-300">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                {s.resume_url && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full rounded-xl glass-button text-xs gap-1.5 mt-2"
                    onClick={() => window.open(s.resume_url, "_blank")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> View Student Resume
                  </Button>
                )}
              </GlassCard>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
