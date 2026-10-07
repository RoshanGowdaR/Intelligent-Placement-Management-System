import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Bell, Building2, ClipboardList, Trophy, CheckCheck, Trash2,
  ExternalLink, Calendar, Sparkles, Filter, CheckCircle2, ArrowLeft,
  Search, Users, CalendarCheck, Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface NotificationItem {
  id: string;
  user_id?: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link?: string | null;
  created_at: string;
}

const DEFAULT_COMPANY_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "comp-notif-1",
    title: "New Candidate Registered",
    message: "A candidate with CGPA 8.9 has registered for your Online Technical Assessment.",
    type: "candidate",
    read: false,
    link: "/company/candidates",
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "comp-notif-2",
    title: "Round 1 Assessment Submissions Ready",
    message: "Candidate responses for Round 1 have been auto-scored. Review qualification rankings.",
    type: "test",
    read: false,
    link: "/company/tests",
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: "comp-notif-3",
    title: "Technical Interview Schedule Confirmed",
    message: "Live coding interviews scheduled for 12 shortlisted candidates for Round 2.",
    type: "interview",
    read: true,
    link: "/company/candidates",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: "comp-notif-4",
    title: "Company Profile Approved",
    message: "University Placement Administration verified your visiting recruiter credentials.",
    type: "system",
    read: true,
    link: "/company/onboarding?mode=edit",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
  },
];

export default function CompanyNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<"all" | "candidate" | "test" | "interview">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const storageKey = useMemo(() => `ipms_company_notifications_${user?.id || "default"}`, [user?.id]);
  const dismissedKey = useMemo(() => `ipms_company_dismissed_${user?.id || "default"}`, [user?.id]);

  const loadNotifications = async () => {
    setLoading(true);
    let dismissedIds: string[] = [];
    try {
      dismissedIds = JSON.parse(localStorage.getItem(dismissedKey) || "[]");
    } catch {}

    let dbItems: NotificationItem[] = [];
    if (user) {
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (!error && data) {
          dbItems = data as NotificationItem[];
        }
      } catch (e) {
        console.warn("Failed fetching notifications from DB:", e);
      }
    }

    let localItems: NotificationItem[] = [];
    try {
      localItems = JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch {}

    const combinedMap = new Map<string, NotificationItem>();

    // 1. Seed defaults if empty
    DEFAULT_COMPANY_NOTIFICATIONS.forEach((n) => {
      if (!dismissedIds.includes(n.id)) {
        combinedMap.set(n.id, n);
      }
    });

    // 2. Add local items
    localItems.forEach((n) => {
      if (!dismissedIds.includes(n.id)) {
        combinedMap.set(n.id, n);
      }
    });

    // 3. Add db items
    dbItems.forEach((n) => {
      if (!dismissedIds.includes(n.id)) {
        combinedMap.set(n.id, n);
      }
    });

    const list = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setNotifications(list);
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();

    if (!user) return;
    const channel = supabase
      .channel("company-notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newItem = payload.new as NotificationItem;
          setNotifications((prev) => [newItem, ...prev.filter((x) => x.id !== newItem.id)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, storageKey, dismissedKey]);

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      const updated = notifications.map((n) => ({ ...n, read: true }));
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}

    if (user) {
      await supabase
        .from("notifications")
        .update({ read: true } as Record<string, unknown>)
        .eq("user_id", user.id)
        .eq("read", false);
    }
    toast.success("All notifications marked as read");
  };

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}

    if (user) {
      await supabase
        .from("notifications")
        .update({ read: true } as Record<string, unknown>)
        .eq("id", id);
    }
  };

  const deleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      const dismissed: string[] = JSON.parse(localStorage.getItem(dismissedKey) || "[]");
      if (!dismissed.includes(id)) {
        dismissed.push(id);
        localStorage.setItem(dismissedKey, JSON.stringify(dismissed));
      }
      const local: NotificationItem[] = JSON.parse(localStorage.getItem(storageKey) || "[]");
      localStorage.setItem(storageKey, JSON.stringify(local.filter((n) => n.id !== id)));
    } catch {}

    if (user) {
      await supabase.from("notifications").delete().eq("id", id);
    }
    toast.success("Notification dismissed");
  };

  const clearAllNotifications = async () => {
    if (!confirm("Are you sure you want to clear your entire notification history?")) return;

    try {
      const allIds = notifications.map((n) => n.id);
      localStorage.setItem(dismissedKey, JSON.stringify(allIds));
      localStorage.setItem(storageKey, JSON.stringify([]));
    } catch {}

    if (user) {
      await supabase.from("notifications").delete().eq("user_id", user.id);
    }
    setNotifications([]);
    toast.success("Notification history cleared");
  };

  const filtered = notifications.filter((n) => {
    const textMatch =
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.message.toLowerCase().includes(search.toLowerCase());
    if (!textMatch) return false;

    if (filter === "candidate") return n.type === "candidate" || n.title.toLowerCase().includes("candidate") || n.message.toLowerCase().includes("registered");
    if (filter === "test") return n.type === "test" || n.title.toLowerCase().includes("assessment") || n.title.toLowerCase().includes("test");
    if (filter === "interview") return n.type === "interview" || n.title.toLowerCase().includes("interview") || n.title.toLowerCase().includes("round");
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      
      {/* Back Link */}
      <Link
        to="/company"
        className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Recruiter Portal</span>
      </Link>

      {/* Hero Header Card */}
      <div className="rounded-3xl bg-card border border-border/80 text-foreground p-6 md:p-8 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-primary">
            <Bell className="h-3.5 w-3.5" />
            <span>Recruiter Activity Feed • Candidate Pipeline Notifications</span>
          </div>

          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            Company Notifications
          </h1>

          <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
            Stay updated with candidate assessment enrollments, test submission alerts, interview round confirmations, and hiring drive communications.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            variant="outline"
            className="rounded-xl border-border bg-card hover:bg-muted text-foreground text-xs font-semibold h-9 px-4 gap-1.5"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span>Mark All Read ({unreadCount})</span>
          </Button>
          {notifications.length > 0 && (
            <Button
              onClick={clearAllNotifications}
              variant="outline"
              className="rounded-xl border-destructive/30 hover:bg-destructive/10 text-destructive text-xs font-semibold h-9 px-3 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear All</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Button
            size="sm"
            onClick={() => setFilter("all")}
            className={`rounded-xl text-xs font-bold h-8 px-4 ${
              filter === "all" ? "bg-[#5b51d8] text-white" : "bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({notifications.length})
          </Button>
          <Button
            size="sm"
            onClick={() => setFilter("candidate")}
            className={`rounded-xl text-xs font-bold h-8 px-4 ${
              filter === "candidate" ? "bg-[#5b51d8] text-white" : "bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            Candidates &amp; Registrations
          </Button>
          <Button
            size="sm"
            onClick={() => setFilter("test")}
            className={`rounded-xl text-xs font-bold h-8 px-4 ${
              filter === "test" ? "bg-[#5b51d8] text-white" : "bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            Assessments &amp; Results
          </Button>
          <Button
            size="sm"
            onClick={() => setFilter("interview")}
            className={`rounded-xl text-xs font-bold h-8 px-4 ${
              filter === "interview" ? "bg-[#5b51d8] text-white" : "bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            Interviews &amp; Rounds
          </Button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notifications…"
            className="pl-8 h-8 rounded-xl text-xs bg-card border-border/80"
          />
        </div>
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {filtered.map((item) => {
          const isCandidate = item.type === "candidate" || item.title.toLowerCase().includes("candidate");
          const isTest = item.type === "test" || item.title.toLowerCase().includes("assessment");
          const isInterview = item.type === "interview" || item.title.toLowerCase().includes("interview");

          return (
            <div
              key={item.id}
              className={`p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                !item.read
                  ? "bg-card border-[#5b51d8]/40 shadow-sm"
                  : "bg-card/50 border-border/60 hover:bg-card"
              }`}
            >
              <div className="flex items-start gap-3.5">
                {/* Icon Container */}
                <div
                  className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isCandidate
                      ? "bg-purple-500/10 text-purple-600"
                      : isTest
                      ? "bg-blue-500/10 text-blue-600"
                      : isInterview
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCandidate ? (
                    <Users className="h-5 w-5" />
                  ) : isTest ? (
                    <ClipboardList className="h-5 w-5" />
                  ) : isInterview ? (
                    <CalendarCheck className="h-5 w-5" />
                  ) : (
                    <Bell className="h-5 w-5" />
                  )}
                </div>

                {/* Content */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm font-bold ${!item.read ? "text-foreground" : "text-foreground/80"}`}>
                      {item.title}
                    </h4>
                    {!item.read && (
                      <span className="h-2 w-2 rounded-full bg-[#5b51d8]" />
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.message}
                  </p>

                  <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                    <span>
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>

                    {item.link && (
                      <Link
                        to={item.link}
                        onClick={() => markAsRead(item.id)}
                        className="text-[#5b51d8] font-bold hover:underline inline-flex items-center gap-1"
                      >
                        <span>View in Console</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Dismiss */}
              <button
                onClick={() => deleteNotification(item.id)}
                className="text-muted-foreground hover:text-rose-500 transition-colors p-1"
                title="Dismiss notification"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-12 text-center rounded-3xl bg-card border border-border/60 space-y-2">
            <Bell className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
            <h4 className="font-bold text-sm text-foreground">No notifications in this category</h4>
            <p className="text-xs text-muted-foreground">All recruiter updates are up to date.</p>
          </div>
        )}
      </div>

    </div>
  );
}
