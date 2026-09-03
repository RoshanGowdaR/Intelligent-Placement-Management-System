import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, Clock, Video, Bell, ArrowLeft, Users, Sparkles, CheckCircle2,
  CalendarDays, ExternalLink
} from "lucide-react";
import { toast } from "sonner";

export default function StudentMeetings() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [notified, setNotified] = useState(false);

  // Mock sessions or fetched from schedules
  const sessions: any[] = [];

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
            Live Sessions
          </span>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mt-0.5">
            Meetings &amp; Interviews
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your live interview slots, placement classes &amp; recruiter workshops — join live, catch recordings, and grab resources.
          </p>
        </div>

        <div className="flex items-center gap-6 shrink-0 font-mono text-center">
          <div>
            <div className="font-display text-xl font-extrabold text-foreground">0</div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Upcoming</div>
          </div>
          <div>
            <div className="font-display text-xl font-extrabold text-foreground">0</div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Completed</div>
          </div>
          <div>
            <div className="font-display text-xl font-extrabold text-foreground">—</div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Attendance</div>
          </div>
        </div>
      </div>

      {/* Hero Card: No sessions scheduled matching Image 3 & 4 */}
      <div className="rounded-3xl bg-[#141428] text-white p-8 md:p-12 text-center border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.3)] relative overflow-hidden space-y-4">
        <div className="absolute -right-16 -top-16 w-60 h-60 bg-[#5b51d8]/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="h-14 w-14 rounded-2xl bg-[#1e1e38] border border-white/10 text-[#8e85ff] flex items-center justify-center mx-auto shadow-inner">
          <Calendar className="h-7 w-7" />
        </div>

        <div className="max-w-md mx-auto space-y-1.5">
          <h3 className="font-display text-xl font-bold text-white">No sessions scheduled</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            There are no live classes, technical mock interviews or drive workshops on the calendar right now.
            New sessions are usually posted a few days in advance — you'll be notified when one is added.
          </p>
        </div>

        <div className="pt-2">
          <Button
            onClick={() => {
              setNotified(!notified);
              toast.success(notified ? "Notification preference removed" : "You will receive in-app and email alerts when sessions are scheduled!");
            }}
            className={`rounded-xl text-xs font-bold h-10 px-5 gap-2 transition-all ${
              notified
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-[#1f1f3a] hover:bg-[#28284c] border border-white/10 text-white shadow-md"
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>{notified ? "Subscribed to session alerts" : "Notify me about new sessions"}</span>
          </Button>
        </div>
      </div>

      {/* Tabs Filter matching Image 3 & 4 */}
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
          Upcoming <span className="ml-1.5 opacity-70 font-mono text-[10px]">0</span>
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
          Past <span className="ml-1.5 opacity-70 font-mono text-[10px]">0</span>
        </Button>
      </div>

      {/* Empty List Card matching Image 3 & 4 */}
      <div className="p-12 rounded-3xl bg-card border border-border/60 text-center space-y-3 shadow-sm">
        <div className="h-12 w-12 rounded-2xl bg-muted/40 text-muted-foreground flex items-center justify-center mx-auto">
          <CalendarDays className="h-6 w-6" />
        </div>
        <div>
          <h4 className="font-display text-base font-bold text-foreground">Nothing scheduled</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-0.5">
            No upcoming sessions yet. Check back soon — new drive briefings and interview slots are added regularly.
          </p>
        </div>
      </div>

    </div>
  );
}
