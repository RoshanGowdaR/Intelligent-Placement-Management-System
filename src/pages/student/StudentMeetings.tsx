import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, Clock, Video, Bell, ArrowLeft, Users, Sparkles, CheckCircle2,
  CalendarDays, ExternalLink, Building2, MapPin
} from "lucide-react";
import { toast } from "sonner";

interface MeetingSession {
  id: string;
  title: string;
  company: string;
  round: string;
  dateTime: string;
  duration: string;
  platform: string;
  meetingLink: string;
  interviewer: string;
  instructions: string;
  status: "upcoming" | "completed" | "confirmed";
}

const demoSessions: MeetingSession[] = [
  {
    id: "demo-google-1",
    title: "Google Campus Hiring — Round 2 Technical Interview",
    company: "Google",
    round: "Round 2",
    dateTime: "Tomorrow, 11:00 AM – 12:00 PM IST",
    duration: "60 mins",
    platform: "Google Meet",
    meetingLink: "https://meet.google.com/xyz-ipms-rec",
    interviewer: "Sundar P. (Staff Software Engineer)",
    instructions: "Live coding in Python / C++ on algorithmic complexity, data structures, and caching architecture.",
    status: "confirmed",
  },
  {
    id: "demo-msft-2",
    title: "Microsoft SDE-1 — System Architecture & Code Pair",
    company: "Microsoft",
    round: "Round 2",
    dateTime: "Oct 14, 2026 • 2:30 PM – 3:30 PM IST",
    duration: "60 mins",
    platform: "Microsoft Teams",
    meetingLink: "https://teams.microsoft.com/meet/ipms-msft-sde",
    interviewer: "Satya K. (Principal Architect)",
    instructions: "Deep dive into web services, REST vs gRPC, and asynchronous background worker queues.",
    status: "upcoming",
  },
];

const pastDemoSessions: MeetingSession[] = [
  {
    id: "demo-amazon-past",
    title: "Amazon SDE Diagnostic & Bar Raiser Briefing",
    company: "Amazon",
    round: "Round 1 Post-OA",
    dateTime: "Oct 2, 2026 • 4:00 PM – 5:00 PM IST",
    duration: "60 mins",
    platform: "Amazon Chime",
    meetingLink: "https://chime.aws/ipms-amazon",
    interviewer: "Recruitment Leadership Team",
    instructions: "Review of Leadership Principles and test assessment diagnostics.",
    status: "completed",
  },
];

export default function StudentMeetings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [notified, setNotified] = useState(true);
  const [sessions, setSessions] = useState<MeetingSession[]>(demoSessions);
  const [pastSessions, setPastSessions] = useState<MeetingSession[]>(pastDemoSessions);

  useEffect(() => {
    if (!user) return;
    // Fetch notifications that represent interviews
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .or("title.ilike.%Interview%,message.ilike.%interview%")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          const fetched: MeetingSession[] = data.map((n, idx) => {
            const linkMatch = n.message?.match(/Link:\s*(https?:\/\/[^\s]+)/i) || n.message?.match(/(https?:\/\/[^\s]+)/i);
            const link = linkMatch ? linkMatch[1] : "https://meet.google.com/ipms-interview";
            return {
              id: n.id || `notif-${idx}`,
              title: n.title,
              company: n.title.includes(":") ? n.title.split(":")[1]?.trim() : "Recruiter",
              round: "Interview",
              dateTime: "Scheduled Session",
              duration: "45 mins",
              platform: "Google Meet",
              meetingLink: link,
              interviewer: "Placement Recruiter",
              instructions: n.message || "Please join on time.",
              status: "confirmed",
            };
          });

          setSessions([...fetched, ...demoSessions]);
        }
      });
  }, [user]);

  const displayedSessions = activeTab === "upcoming" ? sessions : pastSessions;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Breadcrumb Back link */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Dashboard</span>
      </Link>

      {/* Header & Meta Stat Counters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#5b51d8]">
            Live Sessions &amp; Drive Interviews
          </span>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mt-0.5">
            Meetings &amp; Interviews
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your scheduled recruiter interviews, viva velocity discussions &amp; live placement workshops.
          </p>
        </div>

        <div className="flex items-center gap-6 shrink-0 font-mono text-center">
          <div>
            <div className="font-display text-xl font-extrabold text-foreground">{sessions.length}</div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Upcoming</div>
          </div>
          <div>
            <div className="font-display text-xl font-extrabold text-foreground">{pastSessions.length}</div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Completed</div>
          </div>
          <div>
            <div className="font-display text-xl font-extrabold text-emerald-600 dark:text-emerald-400">100%</div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Attendance</div>
          </div>
        </div>
      </div>

      {/* Top Banner Notice */}
      <div className="p-4 rounded-2xl bg-[#5b51d8]/10 border border-[#5b51d8]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-[#5b51d8] shrink-0" />
          <span className="text-foreground">
            You have <strong className="font-bold text-[#5b51d8]">{sessions.length} upcoming interview session(s)</strong> confirmed by campus hiring teams.
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setNotified(!notified);
            toast.success(notified ? "SMS reminders disabled" : "SMS and Email reminders active for all interview slots!");
          }}
          className="rounded-xl text-xs h-8 bg-card text-foreground hover:bg-muted border border-border"
        >
          <Bell className="h-3.5 w-3.5 mr-1 text-[#5b51d8]" />
          <span>{notified ? "Alerts Enabled" : "Enable Alerts"}</span>
        </Button>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => setActiveTab("upcoming")}
          className={`rounded-xl text-xs font-bold h-8 px-4 ${
            activeTab === "upcoming"
              ? "bg-[#5b51d8] text-white"
              : "bg-muted/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          Upcoming <span className="ml-1.5 opacity-80 font-mono text-[10px]">({sessions.length})</span>
        </Button>
        <Button
          size="sm"
          onClick={() => setActiveTab("past")}
          className={`rounded-xl text-xs font-bold h-8 px-4 ${
            activeTab === "past"
              ? "bg-[#5b51d8] text-white"
              : "bg-muted/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          Past Sessions <span className="ml-1.5 opacity-80 font-mono text-[10px]">({pastSessions.length})</span>
        </Button>
      </div>

      {/* Sessions Grid */}
      <div className="space-y-4">
        {displayedSessions.map((session) => (
          <div
            key={session.id}
            className="p-6 rounded-3xl bg-card border border-border/70 hover:border-primary/40 transition-all shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-[#5b51d8]/15 text-[#5b51d8] border-[#5b51d8]/30 text-[10px] font-bold">
                    {session.company}
                  </Badge>
                  <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">
                    {session.round}
                  </Badge>
                  <Badge
                    className={
                      session.status === "confirmed"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]"
                        : session.status === "completed"
                        ? "bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px]"
                        : "bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]"
                    }
                  >
                    {session.status.toUpperCase()}
                  </Badge>
                </div>

                <h3 className="font-display text-lg font-bold text-foreground">
                  {session.title}
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Calendar className="h-3.5 w-3.5 text-[#5b51d8]" />
                    {session.dateTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {session.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Video className="h-3.5 w-3.5 text-muted-foreground" />
                    {session.platform}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {session.status !== "completed" ? (
                  <Button
                    size="sm"
                    className="rounded-xl bg-[#5b51d8] hover:bg-[#4d43cc] text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-md"
                    onClick={() => window.open(session.meetingLink, "_blank")}
                  >
                    <Video className="h-4 w-4" /> Join Interview
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="rounded-xl border-border text-xs h-9 px-4 gap-1.5 text-muted-foreground"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Completed
                  </Button>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
              <div>
                Interviewer: <strong className="text-foreground">{session.interviewer}</strong>
              </div>
              <p className="text-[11px] italic text-muted-foreground">
                "{session.instructions}"
              </p>
            </div>
          </div>
        ))}

        {displayedSessions.length === 0 && (
          <div className="p-12 rounded-3xl bg-card border border-border/60 text-center space-y-3 shadow-sm">
            <div className="h-12 w-12 rounded-2xl bg-muted/40 text-muted-foreground flex items-center justify-center mx-auto">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-display text-base font-bold text-foreground">Nothing scheduled</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-0.5">
                No sessions in this tab yet. Check back soon!
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
