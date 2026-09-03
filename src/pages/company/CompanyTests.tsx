import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GlassCard } from "@/components/3d/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ClipboardList, Plus, Trash2, Clock, Calendar, CheckCircle2, AlertTriangle, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isPast } from "date-fns";

export default function CompanyTests() {
  const { user } = useAuth();
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State with draft persistence
  const [title, setTitle] = useState(() => sessionStorage.getItem("company_test_title") || "");
  const [scheduledDate, setScheduledDate] = useState(() => sessionStorage.getItem("company_test_date") || "");
  const [duration, setDuration] = useState(() => Number(sessionStorage.getItem("company_test_duration")) || 60);
  const [passPercentage, setPassPercentage] = useState(() => Number(sessionStorage.getItem("company_test_pass")) || 60);
  const [maxParticipants, setMaxParticipants] = useState(() => Number(sessionStorage.getItem("company_test_participants")) || 150);
  const [registrationDeadline, setRegistrationDeadline] = useState(() => sessionStorage.getItem("company_test_deadline") || "");

  useEffect(() => {
    if (title || scheduledDate) {
      sessionStorage.setItem("company_test_title", title);
      sessionStorage.setItem("company_test_date", scheduledDate);
      sessionStorage.setItem("company_test_duration", String(duration));
      sessionStorage.setItem("company_test_pass", String(passPercentage));
      sessionStorage.setItem("company_test_participants", String(maxParticipants));
      sessionStorage.setItem("company_test_deadline", registrationDeadline);
    }
  }, [title, scheduledDate, duration, passPercentage, maxParticipants, registrationDeadline]);

  const clearCompanyDraft = () => {
    sessionStorage.removeItem("company_test_title");
    sessionStorage.removeItem("company_test_date");
    sessionStorage.removeItem("company_test_duration");
    sessionStorage.removeItem("company_test_pass");
    sessionStorage.removeItem("company_test_participants");
    sessionStorage.removeItem("company_test_deadline");
  };

  useEffect(() => {
    fetchCompanyTests();
  }, [user]);

  const fetchCompanyTests = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: comp } = await supabase
        .from("companies")
        .select("id, name")
        .eq("user_id", user.id)
        .maybeSingle();

      let query = supabase.from("tests").select("*, schedules(count)");
      if (comp?.id) {
        query = query.or(`created_by.eq.${user.id},company_id.eq.${comp.id}`);
      } else {
        query = query.eq("created_by", user.id);
      }

      const { data, error } = await query.order("scheduled_date", { ascending: true });
      if (error) throw error;
      setTests(data ?? []);
    } catch (err: any) {
      console.error("Error fetching company tests:", err);
      toast.error("Failed to load assessments");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !scheduledDate) {
      toast.error("Please fill in assessment title and test date");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: comp } = await supabase
        .from("companies")
        .select("id, name")
        .eq("user_id", user?.id)
        .maybeSingle();

      // Sample standardized questions bank
      const sampleQuestionBank = [
        {
          id: "q1",
          type: "mcq",
          subject: "Technical Aptitude",
          topic: "Algorithms",
          text: "What is the time complexity of searching in a Balanced Binary Search Tree?",
          options: ["O(1)", "O(log N)", "O(N)", "O(N log N)"],
          correct_answer: "O(log N)",
          points: 1,
        },
        {
          id: "q2",
          type: "mcq",
          subject: "Technical Aptitude",
          topic: "Data Structures",
          text: "Which data structure follows the LIFO (Last In First Out) principle?",
          options: ["Queue", "Stack", "Array", "Linked List"],
          correct_answer: "Stack",
          points: 1,
        },
        {
          id: "q3",
          type: "mcq",
          subject: "Technical Aptitude",
          topic: "DBMS",
          text: "In SQL, which clause is used to filter group results after aggregation?",
          options: ["WHERE", "HAVING", "GROUP BY", "ORDER BY"],
          correct_answer: "HAVING",
          points: 1,
        },
      ];

      const { data: insertedTest, error } = await supabase
        .from("tests")
        .insert({
          title: title.trim(),
          scheduled_date: new Date(scheduledDate).toISOString(),
          duration: Number(duration) || 60,
          max_participants: Number(maxParticipants) || 100,
          pass_criteria: { pass_percentage: Number(passPercentage) || 50 },
          registration_start: new Date().toISOString(),
          registration_deadline: registrationDeadline ? new Date(registrationDeadline).toISOString() : null,
          created_by: user?.id,
          created_by_role: "company" as any,
          company_id: comp?.id || null,
          question_bank: sampleQuestionBank,
          questions_per_student: sampleQuestionBank.length,
        })
        .select()
        .single();

      if (error) throw error;

      // Broadcast notification to students
      try {
        const { data: students } = await supabase.from("profiles").select("id");
        if (students && students.length > 0) {
          const notifs = students.map((s) => ({
            user_id: s.id,
            title: `📝 New Assessment Opened: ${title}`,
            message: `${comp?.name || "Visiting Recruiter"} has opened registration for "${title}". Register before ${registrationDeadline ? new Date(registrationDeadline).toLocaleDateString() : "test date"}!`,
            type: "info",
            link: "/dashboard/tests",
          }));
          await supabase.from("notifications").insert(notifs);
        }
      } catch (notifErr) {
        console.warn("Broadcast notification error:", notifErr);
      }

      toast.success("Assessment created & student registration window opened!");
      setCreateOpen(false);
      resetForm();
      fetchCompanyTests();
    } catch (err: any) {
      console.error("Create test error:", err);
      toast.error(err?.message || "Failed to create assessment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm("Are you sure you want to delete this assessment?")) return;

    try {
      const { error } = await supabase.from("tests").delete().eq("id", testId);
      if (error) throw error;
      toast.success("Assessment deleted");
      fetchCompanyTests();
    } catch (err: any) {
      toast.error(err?.message || "Could not delete test");
    }
  };

  const resetForm = () => {
    clearCompanyDraft();
    setTitle("");
    setScheduledDate("");
    setDuration(60);
    setPassPercentage(60);
    setMaxParticipants(150);
    setRegistrationDeadline("");
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-white">Company Assessments</h1>
          <p className="text-sm text-slate-400">
            Create assessment rounds, configure cutoff benchmarks & set registration deadlines.
          </p>
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          className="h-11 px-5 rounded-xl bg-primary text-white font-bold shadow-[0_0_20px_rgba(108,92,231,0.5)] gap-2"
        >
          <Plus className="h-4 w-4" /> Schedule Assessment
        </Button>
      </div>

      {/* Tests Grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-2" />
            Loading assessments…
          </div>
        ) : tests.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground mb-3 opacity-40" />
            <h3 className="font-display text-lg font-bold text-white">No assessments created</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Schedule your first hiring test to begin evaluating eligible campus candidates.
            </p>
            <Button onClick={() => setCreateOpen(true)} className="mt-5 rounded-xl bg-primary text-white">
              <Plus className="mr-2 h-4 w-4" /> Create First Test
            </Button>
          </GlassCard>
        ) : (
          tests.map((test) => {
            const deadlinePast = test.registration_deadline ? isPast(new Date(test.registration_deadline)) : false;
            return (
              <GlassCard key={test.id} className="p-6 border-white/10 hover:border-primary/40 transition-colors">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h2 className="font-display text-xl font-bold text-white">{test.title}</h2>
                      {test.registration_deadline && (
                        deadlinePast ? (
                          <Badge variant="destructive" className="text-xs">Registration Closed</Badge>
                        ) : (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                            Registration Open
                          </Badge>
                        )
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-primary" />
                        Test Date: {new Date(test.scheduled_date).toLocaleString()}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-purple-400" />
                        Duration: {test.duration} mins
                      </span>
                      <span>•</span>
                      <span>Passing Cutoff: {test.pass_criteria?.pass_percentage ?? 50}%</span>
                      {test.registration_deadline && (
                        <>
                          <span>•</span>
                          <span className="text-amber-400">
                            Deadline: {new Date(test.registration_deadline).toLocaleString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTest(test.id)}
                      className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10"
                      title="Delete assessment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>

      {/* Create Test Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl rounded-3xl border border-white/15 bg-card/95 backdrop-blur-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-white">
              Create Placement Assessment Round
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300">
              Configure exam parameters, cutoff threshold & mandatory candidate registration deadline.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTest} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-slate-400 font-semibold">Assessment Title *</Label>
              <Input
                required
                placeholder="e.g. Technical Coding & Aptitude Round 1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs uppercase text-slate-400 font-semibold">Scheduled Date & Time *</Label>
                <Input
                  required
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase text-amber-400 font-semibold">Registration Deadline (Lockout)</Label>
                <Input
                  type="datetime-local"
                  value={registrationDeadline}
                  onChange={(e) => setRegistrationDeadline(e.target.value)}
                  className="h-11 rounded-xl border-amber-500/30 bg-amber-500/5 text-white"
                />
                <p className="text-[11px] text-slate-400">Unregistered candidates will be strictly locked out once this closes.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs uppercase text-slate-400 font-semibold">Duration (Mins)</Label>
                <Input
                  type="number"
                  min={10}
                  max={300}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase text-slate-400 font-semibold">Cutoff Pass (%)</Label>
                <Input
                  type="number"
                  min={10}
                  max={100}
                  value={passPercentage}
                  onChange={(e) => setPassPercentage(Number(e.target.value))}
                  className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase text-slate-400 font-semibold">Max Participants</Label>
                <Input
                  type="number"
                  min={10}
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(Number(e.target.value))}
                  className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 flex gap-2 justify-between">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} className="rounded-xl text-muted-foreground">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="h-11 px-6 rounded-xl bg-primary text-white font-bold">
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing…</> : "Publish Assessment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
