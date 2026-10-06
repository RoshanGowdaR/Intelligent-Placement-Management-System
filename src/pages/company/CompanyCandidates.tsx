import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GlassCard } from "@/components/3d/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users, Search, CheckCircle2, XCircle, Award, ExternalLink,
  ShieldAlert, Loader2, CalendarDays, Eye, UserCheck, Video, Clock
} from "lucide-react";
import { toast } from "sonner";
import { StudentProfileDialog } from "@/components/profile/StudentProfileDialog";

export default function CompanyCandidates() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("registered");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [eligibleRoster, setEligibleRoster] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState<any>(null);

  // Profile View State
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  // Interview Schedule State
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [interviewCandidate, setInterviewCandidate] = useState<any>(null);
  const [interviewTitle, setInterviewTitle] = useState("Round 2 - Technical Interview & Live Coding");
  const [interviewRound, setInterviewRound] = useState("Round 2");
  const [interviewDate, setInterviewDate] = useState("2026-10-10");
  const [interviewTime, setInterviewTime] = useState("11:00 AM IST");
  const [interviewLink, setInterviewLink] = useState("https://meet.google.com/ipms-interview-session");
  const [interviewNotes, setInterviewNotes] = useState("Please join 5 mins before schedule. Have your code editor ready.");
  const [schedulingInterview, setSchedulingInterview] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, [user]);

  const handleOpenInterview = (candidate: any) => {
    setInterviewCandidate(candidate);
    setInterviewTitle(`Technical Interview (${candidate.name || "Candidate"})`);
    setInterviewDialogOpen(true);
  };

  const handleConfirmInterview = async () => {
    if (!interviewCandidate?.id) {
      toast.error("Invalid candidate selected");
      return;
    }
    setSchedulingInterview(true);
    try {
      // 1. Notify the student
      await supabase.from("notifications").insert({
        user_id: interviewCandidate.id,
        title: `Interview Scheduled: ${companyData?.name || "Company"} (${interviewRound})`,
        message: `Your interview for ${interviewTitle} is scheduled on ${interviewDate} at ${interviewTime}. Meeting link: ${interviewLink}. ${interviewNotes}`,
        link: "/dashboard/meetings",
        type: "interview",
      } as any);

      toast.success(`Interview scheduled with ${interviewCandidate.name || "Candidate"}! Notification sent.`);
      setInterviewDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule interview");
    } finally {
      setSchedulingInterview(false);
    }
  };

  const fetchCandidates = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: comp } = await supabase
        .from("companies")
        .select("id, name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (comp) setCompanyData(comp);

      // 1. Fetch test attempts for tests belonging to this company
      let attemptsQuery = supabase
        .from("test_attempts")
        .select("id, total_score, passed, tab_switches, completed_at, student_id, profiles(id, name, email, usn, branch, cgpa, resume_url, avatar_url, skills, headline, bio, linkedin_url, github_url, portfolio_url, year_of_passing), tests(title, id)")
        .order("completed_at", { ascending: false });

      if (comp?.id) {
        attemptsQuery = attemptsQuery.or(`tests.created_by.eq.${user.id},tests.company_id.eq.${comp.id}`);
      }

      const { data: attemptsData } = await attemptsQuery;
      setCandidates(attemptsData ?? []);

      // 2. Fetch all student profiles for general eligible talent pool
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name, email, usn, branch, cgpa, skills, resume_url, avatar_url, headline, bio, linkedin_url, github_url, portfolio_url, year_of_passing")
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
          <h1 className="font-display text-3xl font-extrabold text-foreground">Candidate Roster</h1>
          <p className="text-sm text-muted-foreground">
            Review test submissions, evaluate candidate qualifications &amp; explore campus talent pool.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, USN, branch…"
            className="pl-9 h-10 rounded-xl border-border bg-card text-foreground"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/40 border border-border/70 p-1 rounded-2xl">
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
            <div className="p-12 text-center text-muted-foreground">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-2" />
              Loading submissions…
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-card border border-border/70">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-3 opacity-40" />
              <h3 className="font-display text-lg font-bold text-foreground">No candidate submissions found</h3>
              <p className="text-xs text-muted-foreground mt-1">
                When students complete your scheduled assessments, their scores will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCandidates.map((c) => {
                const profileObj = c.profiles ? { ...c.profiles, id: c.student_id || c.profiles.id } : null;
                return (
                  <div key={c.id} className="p-5 rounded-2xl bg-card border border-border/70 hover:border-primary/40 transition-colors shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-[#5b51d8]/15 text-[#5b51d8] flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                            {c.profiles?.avatar_url ? (
                              <img src={c.profiles.avatar_url} alt={c.profiles.name} className="h-full w-full object-cover" />
                            ) : (
                              c.profiles?.name ? c.profiles.name.charAt(0).toUpperCase() : "C"
                            )}
                          </div>
                          <div>
                            <span className="font-display text-base font-bold text-foreground">
                              {c.profiles?.name || c.profiles?.email || "Candidate"}
                            </span>
                            <Badge variant="secondary" className="text-xs ml-2">
                              {c.profiles?.branch || "B.Tech"}
                            </Badge>
                            {c.profiles?.usn && (
                              <span className="text-xs font-mono text-muted-foreground ml-1.5">({c.profiles.usn})</span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground pl-12">
                          Assessment: <strong className="text-foreground font-semibold">{c.tests?.title || "Test"}</strong> • CGPA: {c.profiles?.cgpa || "N/A"}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-right mr-2">
                          <div className="font-mono text-lg font-extrabold text-foreground">{c.total_score}%</div>
                          <Badge className={c.passed ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30 text-[10px]" : "bg-destructive/20 text-destructive text-[10px]"}>
                            {c.passed ? "Qualified" : "Below Cutoff"}
                          </Badge>
                        </div>

                        {/* View Profile */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl border-border text-xs gap-1.5 hover:bg-[#5b51d8] hover:text-white"
                          onClick={() => {
                            setSelectedStudent(profileObj);
                            setProfileDialogOpen(true);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 text-[#5b51d8]" /> View Profile
                        </Button>

                        {/* Schedule Interview */}
                        <Button
                          size="sm"
                          className="rounded-xl bg-[#5b51d8] hover:bg-[#4d43cc] text-white text-xs gap-1.5 shadow-sm"
                          onClick={() => handleOpenInterview(profileObj || { name: "Candidate" })}
                        >
                          <CalendarDays className="h-3.5 w-3.5" /> Schedule Interview
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: All Eligible Students */}
        <TabsContent value="all_eligible" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRoster.map((s) => (
              <div key={s.id} className="p-5 rounded-2xl bg-card border border-border/70 space-y-3 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-[#5b51d8]/15 text-[#5b51d8] flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                        {s.avatar_url ? (
                          <img src={s.avatar_url} alt={s.name} className="h-full w-full object-cover" />
                        ) : (
                          s.name ? s.name.charAt(0).toUpperCase() : "S"
                        )}
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-foreground text-sm leading-tight">{s.name || s.email}</h3>
                        <p className="text-[11px] text-muted-foreground">{s.branch || "General Engineering"} {s.usn ? `• ${s.usn}` : ""}</p>
                      </div>
                    </div>
                    <Badge className="bg-primary/15 text-primary font-mono text-xs">
                      {s.cgpa ? `${s.cgpa} CGPA` : "N/A"}
                    </Badge>
                  </div>

                  {s.skills && s.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {s.skills.slice(0, 3).map((skill: string) => (
                        <span key={skill} className="text-[10px] rounded-md bg-muted px-2 py-0.5 text-muted-foreground">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-xl border-border text-xs gap-1 hover:bg-[#5b51d8] hover:text-white"
                    onClick={() => {
                      setSelectedStudent(s);
                      setProfileDialogOpen(true);
                    }}
                  >
                    <Eye className="h-3 w-3 text-[#5b51d8]" /> View Profile
                  </Button>

                  <Button
                    size="sm"
                    className="rounded-xl bg-[#5b51d8] hover:bg-[#4d43cc] text-white text-xs gap-1 shadow-sm px-3"
                    onClick={() => handleOpenInterview(s)}
                    title="Schedule Interview"
                  >
                    <CalendarDays className="h-3.5 w-3.5" /> Interview
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Comprehensive Student Profile Dialog */}
      <StudentProfileDialog
        studentId={selectedStudent?.id}
        initialData={selectedStudent}
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        onScheduleInterview={(s) => {
          setProfileDialogOpen(false);
          handleOpenInterview(s);
        }}
      />

      {/* Schedule Interview Dialog */}
      <Dialog open={interviewDialogOpen} onOpenChange={setInterviewDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl border-border bg-card p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-[#5b51d8]" /> Schedule Candidate Interview
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Candidate: <strong className="text-foreground">{interviewCandidate?.name || interviewCandidate?.email || "Student"}</strong> ({interviewCandidate?.usn || "Candidate"})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Interview Title / Round</Label>
              <Input
                value={interviewTitle}
                onChange={(e) => setInterviewTitle(e.target.value)}
                placeholder="e.g. Technical Round 2 - Live Problem Solving"
                className="h-9 rounded-xl text-xs bg-muted/30 border-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Drive Round</Label>
                <Input
                  value={interviewRound}
                  onChange={(e) => setInterviewRound(e.target.value)}
                  placeholder="Round 2"
                  className="h-9 rounded-xl text-xs bg-muted/30 border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="h-9 rounded-xl text-xs bg-muted/30 border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Time &amp; Timezone</Label>
                <Input
                  value={interviewTime}
                  onChange={(e) => setInterviewTime(e.target.value)}
                  placeholder="11:00 AM IST"
                  className="h-9 rounded-xl text-xs bg-muted/30 border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Video Platform</Label>
                <Input
                  value="Google Meet"
                  disabled
                  className="h-9 rounded-xl text-xs bg-muted/30 border-border text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Meeting URL</Label>
              <Input
                value={interviewLink}
                onChange={(e) => setInterviewLink(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="h-9 rounded-xl text-xs bg-muted/30 border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Instructions for Candidate</Label>
              <Textarea
                value={interviewNotes}
                onChange={(e) => setInterviewNotes(e.target.value)}
                placeholder="Instructions, topics to prepare, etc."
                className="rounded-xl text-xs bg-muted/30 border-border min-h-[70px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setInterviewDialogOpen(false)}
              className="rounded-xl text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmInterview}
              disabled={schedulingInterview}
              className="rounded-xl bg-[#5b51d8] hover:bg-[#4d43cc] text-white font-bold text-xs h-9 gap-1.5"
            >
              {schedulingInterview ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarDays className="h-3.5 w-3.5" />}
              Send Invite &amp; Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
