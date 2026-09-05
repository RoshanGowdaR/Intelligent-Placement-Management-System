import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell, Building2, ClipboardList, Trophy, CheckCheck, Trash2,
  ExternalLink, Calendar, Sparkles, Filter, CheckCircle2, ArrowLeft
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  created_at: string;
}

export default function StudentNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<"all" | "company" | "test" | "round">("all");
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setNotifications(data as NotificationItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime inserts
    if (!user) return;
    const channel = supabase
      .channel("student-notifications-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as NotificationItem, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAllAsRead = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    }
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast.success("Notification dismissed");
  };

  const filtered = notifications.filter((n) => {
    if (filter === "company") return n.title.toLowerCase().includes("company") || n.message.toLowerCase().includes("company");
    if (filter === "test") return n.title.toLowerCase().includes("test") || n.title.toLowerCase().includes("assessment");
    if (filter === "round") return n.title.toLowerCase().includes("round") || n.title.toLowerCase().includes("interview");
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      
      {/* Back Link */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Dashboard</span>
      </Link>

      {/* Hero Header Card matching Zidio Template */}
      <div className="rounded-3xl bg-card border border-border/80 text-foreground p-6 md:p-8 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-primary">
            <Bell className="h-3.5 w-3.5" />
            <span>Activity Feed • Notification History</span>
          </div>

          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            Placement Notifications
          </h1>

          <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
            Keep track of incoming visiting company announcements, test releases, round progression results, and placement cell directives.
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
        </div>
      </div>

      {/* Filter Tabs */}
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
          onClick={() => setFilter("company")}
          className={`rounded-xl text-xs font-bold h-8 px-4 ${
            filter === "company" ? "bg-[#5b51d8] text-white" : "bg-muted/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          Companies &amp; Drives
        </Button>
        <Button
          size="sm"
          onClick={() => setFilter("test")}
          className={`rounded-xl text-xs font-bold h-8 px-4 ${
            filter === "test" ? "bg-[#5b51d8] text-white" : "bg-muted/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          Assessments
        </Button>
        <Button
          size="sm"
          onClick={() => setFilter("round")}
          className={`rounded-xl text-xs font-bold h-8 px-4 ${
            filter === "round" ? "bg-[#5b51d8] text-white" : "bg-muted/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          Rounds &amp; Results
        </Button>
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {filtered.map((item) => {
          const isCompany = item.title.toLowerCase().includes("company");
          const isTest = item.title.toLowerCase().includes("test");
          const isRound = item.title.toLowerCase().includes("round");

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
                    isCompany
                      ? "bg-purple-500/10 text-purple-600"
                      : isTest
                      ? "bg-blue-500/10 text-blue-600"
                      : isRound
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompany ? (
                    <Building2 className="h-5 w-5" />
                  ) : isTest ? (
                    <ClipboardList className="h-5 w-5" />
                  ) : isRound ? (
                    <Trophy className="h-5 w-5" />
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
                        <span>Open Details</span>
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
                title="Dismiss"
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
            <p className="text-xs text-muted-foreground">You are all caught up!</p>
          </div>
        )}
      </div>

    </div>
  );
}
