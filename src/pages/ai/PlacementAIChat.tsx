import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSpeech } from "@/hooks/useSpeech";
import { askGemini } from "@/lib/gemini";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Bot, Mic, MicOff, Volume2, VolumeX, Send, Sparkles, Loader2,
  PanelLeftClose, PanelLeftOpen, Plus, MessageSquare, Trash2,
  Copy, Check, User, ArrowUp, Lightbulb, BarChart3, Building2,
  GraduationCap, ClipboardList, ShieldCheck, ChevronRight, CornerDownLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  isDeepThought?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export default function PlacementAIChat({ forcedRole }: { forcedRole?: "admin" | "company" | "student" }) {
  const { user, role: authRole } = useAuth();
  const role = forcedRole || authRole || "student";

  // Sidebar toggle state (like ChatGPT's [||] button)
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Sessions and Active Chat state
  const storageKey = `ipms_chat_history_${role}_${user?.id || "guest"}`;
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");

  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeepThinking, setIsDeepThinking] = useState(false);
  const [ttsActiveId, setTtsActiveId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    isListening,
    transcript,
    setTranscript,
    startListening,
    stopListening,
    isSpeaking,
    speak,
    stopSpeaking,
  } = useSpeech();

  // Load chat history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: ChatSession[] = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0) {
          setCurrentSessionId(parsed[0].id);
          return;
        }
      }
    } catch (_) {}

    // Initialize with a blank default session
    const defaultId = "session_" + Date.now();
    const initSession: ChatSession = {
      id: defaultId,
      title: "New Chat",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    setSessions([initSession]);
    setCurrentSessionId(defaultId);
  }, [storageKey]);

  // Persist sessions to localStorage
  const saveSessions = (updated: ChatSession[]) => {
    setSessions(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (_) {}
  };

  // Current active session
  const currentSession = useMemo(() => {
    return sessions.find((s) => s.id === currentSessionId) || sessions[0];
  }, [sessions, currentSessionId]);

  // Sync speech recognition into input field
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages, isProcessing]);

  // Create a brand-new chat
  const handleNewChat = () => {
    const newId = "session_" + Date.now();
    const newSession: ChatSession = {
      id: newId,
      title: "New Chat",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    const updated = [newSession, ...sessions];
    saveSessions(updated);
    setCurrentSessionId(newId);
    setInput("");
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  // Delete a specific chat session
  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const filtered = sessions.filter((s) => s.id !== id);
    if (filtered.length === 0) {
      const newId = "session_" + Date.now();
      const fresh: ChatSession = {
        id: newId,
        title: "New Chat",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      };
      saveSessions([fresh]);
      setCurrentSessionId(newId);
    } else {
      saveSessions(filtered);
      if (currentSessionId === id) {
        setCurrentSessionId(filtered[0].id);
      }
    }
    toast.success("Chat deleted");
  };

  // Gather live database context based on the current user's role
  const gatherRoleDatabaseContext = async (): Promise<string> => {
    try {
      if (role === "admin") {
        // Full database access for Placement Admin
        const [profilesRes, companiesRes, testsRes, attemptsRes, roundsRes] = await Promise.all([
          supabase.from("profiles").select("id, name, email, branch, cgpa, usn, skills"),
          supabase.from("companies").select("id, name, job_role, salary_package, job_location, min_cgpa"),
          supabase.from("tests").select("id, title, category, scheduled_date, duration, pass_criteria, company_id, companies(name)"),
          supabase.from("test_attempts").select("id, score, passed, total_score, student_id, test_id, tests(title), profiles(name, branch, cgpa)"),
          supabase.from("drive_rounds").select("id, round_name, round_number, round_type, company_id, passing_logic, is_published"),
        ]);

        const profiles = profilesRes.data ?? [];
        const companies = companiesRes.data ?? [];
        const tests = testsRes.data ?? [];
        const attempts = attemptsRes.data ?? [];
        const rounds = roundsRes.data ?? [];

        const totalPassed = attempts.filter((a) => a.passed).length;
        const passRate = attempts.length > 0 ? Math.round((totalPassed / attempts.length) * 100) : 0;

        // Branch breakdown
        const branchCounts: Record<string, number> = {};
        profiles.forEach((p) => {
          const b = p.branch || "General";
          branchCounts[b] = (branchCounts[b] || 0) + 1;
        });

        // Top 5 students
        const topStudents = [...profiles]
          .filter((p) => p.cgpa !== null)
          .sort((a, b) => (b.cgpa ?? 0) - (a.cgpa ?? 0))
          .slice(0, 5)
          .map((p) => `${p.name} (${p.branch}, CGPA: ${p.cgpa})`);

        return `
ROLE: PLACEMENT ADMINISTRATION (FULL DATABASE ACCESS GRANTED)
You have verified, unredacted forensic access to the entire institution placement database:
- Total Registered Students: ${profiles.length}
- Branches: ${JSON.stringify(branchCounts)}
- Top Academic Rankers: ${topStudents.join("; ")}
- Registered Companies (${companies.length}): ${companies.map((c) => `${c.name} (${c.job_role || "Engineering"}, CTC: ${c.salary_package || "N/A"})`).join("; ")}
- Total Placement Tests Conducted: ${tests.length}
- Test List: ${tests.map((t) => `"${t.title}" (${(t.companies as any)?.name || "General"}, Scheduled: ${t.scheduled_date})`).join("; ")}
- Total Attempt Submissions: ${attempts.length} (Overall Pass Rate: ${passRate}%)
- Recruitment Drive Rounds: ${rounds.length} rounds configured across companies.

INSTRUCTIONS:
Provide authoritative, comprehensive, and data-backed answers. You can generate formatted placement reports, analyze test performances, calculate pass percentages, compare company packages, audit candidate qualifications, and answer any historical question about tests conducted. Use markdown tables, bold highlights, and clean bulleted sections.
        `.trim();
      } else if (role === "company") {
        // Scoped to Recruiter's Company
        const { data: companyRecord } = await supabase
          .from("companies")
          .select("id, name, job_role, salary_package")
          .eq("user_id", user?.id || "")
          .maybeSingle();

        const compId = companyRecord?.id;
        const [testsRes, attemptsRes, roundsRes] = await Promise.all([
          compId ? supabase.from("tests").select("*").eq("company_id", compId) : { data: [] },
          compId ? supabase.from("test_attempts").select("*, tests(title), profiles(name, branch, cgpa, usn)").eq("tests.company_id", compId) : { data: [] },
          compId ? supabase.from("drive_rounds").select("*").eq("company_id", compId) : { data: [] },
        ]);

        return `
ROLE: ENTERPRISE RECRUITER (${companyRecord?.name || "Company Partner"})
Scoped exclusively to this company's hiring pipeline:
- Company Name: ${companyRecord?.name || "Your Company"}
- Hiring Role: ${companyRecord?.job_role || "Software Engineer"}
- Assessments Created: ${(testsRes.data ?? []).length}
- Candidate Submissions: ${(attemptsRes.data ?? []).length}
- Active Drive Rounds: ${(roundsRes.data ?? []).length}

INSTRUCTIONS:
Assist this recruiter in managing their candidate evaluations, setting test cutoffs, reviewing applicant submissions, and structuring multi-round placement drives. Do not disclose private metrics of rival companies.
        `.trim();
      } else {
        // Student Assistant
        const [profileRes, myAttemptsRes, upcomingTestsRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user?.id || "").maybeSingle(),
          supabase.from("test_attempts").select("*, tests(title, category)").eq("student_id", user?.id || ""),
          supabase.from("tests").select("title, category, scheduled_date, companies(name)").order("scheduled_date", { ascending: true }).limit(5),
        ]);

        const profile = profileRes.data;
        const myAttempts = myAttemptsRes.data ?? [];
        const upcoming = upcomingTestsRes.data ?? [];

        return `
ROLE: CANDIDATE CAREER & PLACEMENT MENTOR
Mentoring student: ${profile?.name || user?.email || "Student"}
- Branch: ${profile?.branch || "B.Tech"} | CGPA: ${profile?.cgpa || "N/A"}
- Skills: ${(profile?.skills || []).join(", ") || "General"}
- Completed Tests: ${myAttempts.length}
- Upcoming Drives: ${upcoming.map((u) => `${u.title} (${(u.companies as any)?.name || "Campus"})`).join("; ")}

INSTRUCTIONS:
Act as an expert placement tutor and interview coach. Help this student master technical and aptitude MCQs, practice coding challenges, optimize their resume, and build confidence for upcoming campus drives.
        `.trim();
      }
    } catch (err) {
      console.warn("Telemetry context build notice:", err);
      return `ROLE: ${role.toUpperCase()} ASSISTANT`;
    }
  };

  // Submit Prompt to Gemini AI
  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || input).trim();
    if (!messageText || isProcessing) return;

    if (isListening) stopListening();

    // Create user message
    const userMsg: ChatMessage = {
      id: "msg_" + Date.now(),
      sender: "user",
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Auto-derive title from first message
    let updatedTitle = currentSession.title;
    if (currentSession.messages.length === 0 || currentSession.title === "New Chat") {
      updatedTitle = messageText.length > 28 ? messageText.slice(0, 28) + "…" : messageText;
    }

    const newMessages = [...currentSession.messages, userMsg];
    const updatedSessions = sessions.map((s) => {
      if (s.id === currentSession.id) {
        return {
          ...s,
          title: updatedTitle,
          updatedAt: new Date().toISOString(),
          messages: newMessages,
        };
      }
      return s;
    });

    saveSessions(updatedSessions);
    setInput("");
    setIsProcessing(true);

    try {
      const systemContext = await gatherRoleDatabaseContext();
      const thinkingPrefix = isDeepThinking
        ? "Perform step-by-step deep architectural reasoning before presenting your final structured answer.\n"
        : "";

      const aiResponseText = await askGemini(
        `${thinkingPrefix}${messageText}`,
        systemContext
      );

      const assistantMsg: ChatMessage = {
        id: "msg_" + (Date.now() + 1),
        sender: "assistant",
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isDeepThought: isDeepThinking,
      };

      const finalSessions = updatedSessions.map((s) => {
        if (s.id === currentSession.id) {
          return {
            ...s,
            messages: [...newMessages, assistantMsg],
          };
        }
        return s;
      });

      saveSessions(finalSessions);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: "msg_" + (Date.now() + 1),
        sender: "assistant",
        text: `⚠️ **Error querying Placement AI:** ${err?.message || "Failed to reach AI Engine. Please verify internet connection."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      const errorSessions = updatedSessions.map((s) => {
        if (s.id === currentSession.id) {
          return {
            ...s,
            messages: [...newMessages, errorMsg],
          };
        }
        return s;
      });

      saveSessions(errorSessions);
      toast.error("Failed to generate response");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSpeech = (id: string, text: string) => {
    if (isSpeaking && ttsActiveId === id) {
      stopSpeaking();
      setTtsActiveId(null);
    } else {
      stopSpeaking();
      speak(text);
      setTtsActiveId(id);
    }
  };

  // User display name for ChatGPT greeting: "Good to see you, [Name]."
  const userName =
    user?.user_metadata?.name ||
    user?.email?.split("@")[0]?.replace(/[._-]/g, " ") ||
    "User";

  const formattedName =
    userName.charAt(0).toUpperCase() + userName.slice(1);

  // Role-specific starter prompts
  const starterPrompts = useMemo(() => {
    if (role === "admin") {
      return [
        {
          icon: BarChart3,
          title: "Drive & Placement Report",
          prompt: "Generate a comprehensive recruitment drive report with student qualification rates and company velocity.",
        },
        {
          icon: GraduationCap,
          title: "Top Candidate Podiums",
          prompt: "Show the top cohort academic performers by CGPA and branch distribution.",
        },
        {
          icon: Building2,
          title: "Company Drive Analytics",
          prompt: "Analyze past company recruitment drives, average test scores, and candidate clearance pipelines.",
        },
        {
          icon: ShieldCheck,
          title: "Proctoring Integrity Audit",
          prompt: "Review candidate test attempts, proctoring violation logs, and flagged integrity issues.",
        },
      ];
    } else if (role === "company") {
      return [
        {
          icon: ClipboardList,
          title: "My Drive Assessments",
          prompt: "Summarize all tests created for my company and candidate registration statuses.",
        },
        {
          icon: BarChart3,
          title: "Candidate Performance",
          prompt: "Evaluate candidate test submission scores and recommend passing cutoffs for Round 1.",
        },
        {
          icon: GraduationCap,
          title: "Campus Talent Pool",
          prompt: "Filter the eligible campus talent pool matching our engineering requirements.",
        },
        {
          icon: Lightbulb,
          title: "Round Structure Tips",
          prompt: "How should I structure our 3-round campus drive (Online Assessment -> Technical Interview -> HR)?",
        },
      ];
    } else {
      return [
        {
          icon: Lightbulb,
          title: "Practice Technical MCQs",
          prompt: "Give me 5 challenging Data Structures and Algorithm questions with detailed explanations.",
        },
        {
          icon: GraduationCap,
          title: "Optimize My Resume",
          prompt: "What are the top skills recruiters look for in Computer Science and Engineering placements?",
        },
        {
          icon: ClipboardList,
          title: "Upcoming Test Prep",
          prompt: "What topics should I prepare for upcoming company online assessments?",
        },
        {
          icon: Sparkles,
          title: "Mock Interview Questions",
          prompt: "Conduct a mock technical interview with me for a Software Development Engineer role.",
        },
      ];
    }
  }, [role]);

  return (
    <div className="flex h-[calc(100vh-80px)] w-full overflow-hidden bg-background text-foreground relative rounded-3xl border border-border/70 shadow-sm">
      
      {/* 1. Collapsible ChatGPT Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            key="chatgpt-sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="h-full bg-card/95 border-r border-border/70 flex flex-col justify-between shrink-0 overflow-hidden select-none z-20"
          >
            {/* Sidebar Top: Header & New Chat */}
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between px-2 pt-1">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-[#5b51d8] flex items-center justify-center text-white shadow-sm">
                    <Sparkles className="h-4 w-4 fill-white" />
                  </div>
                  <span className="font-display font-extrabold text-sm tracking-tight">Placement AI</span>
                </div>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSidebarOpen(false)}
                        className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                      >
                        <PanelLeftClose className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Close sidebar</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* New Chat Button */}
              <Button
                onClick={handleNewChat}
                className="w-full justify-start gap-2.5 h-10 rounded-xl bg-muted/60 hover:bg-muted text-foreground font-semibold text-xs border border-border/60 shadow-none transition-all"
              >
                <Plus className="h-4 w-4 text-primary" />
                <span>New chat</span>
              </Button>
            </div>

            {/* Middle: Chat History Thread List */}
            <div className="flex-1 overflow-y-auto px-3 space-y-1 scrollbar-thin">
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-2 py-1.5">
                Recent Chats
              </div>

              {sessions.map((sess) => {
                const isActive = sess.id === currentSessionId;
                return (
                  <div
                    key={sess.id}
                    onClick={() => {
                      setCurrentSessionId(sess.id);
                      if (window.innerWidth < 768) setSidebarOpen(false);
                    }}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs font-medium transition-all ${
                      isActive
                        ? "bg-primary/15 text-primary font-bold border border-primary/20"
                        : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 truncate">
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{sess.title}</span>
                    </div>

                    <button
                      onClick={(e) => handleDeleteSession(e, sess.id)}
                      className="opacity-0 group-hover:opacity-100 hover:text-destructive p-1 rounded transition-opacity"
                      title="Delete chat"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bottom User Bar */}
            <div className="p-3 border-t border-border/60 bg-muted/30">
              <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#5b51d8] to-[#8075ff] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground truncate">{formattedName}</p>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 capitalize text-muted-foreground">
                    {role === "admin" ? "Placement Admin" : role === "company" ? "Recruiter" : "Candidate"}
                  </Badge>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 2. Main ChatGPT Conversation Panel */}
      <main className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
        
        {/* Top Floating Action Bar (Open Sidebar button when closed) */}
        <div className="h-12 border-b border-border/40 px-4 flex items-center justify-between shrink-0 bg-background/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSidebarOpen(true)}
                      className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <PanelLeftOpen className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Open sidebar</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewChat}
                className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> New chat
              </Button>
            )}

            <div className="flex items-center gap-2 ml-1">
              <span className="font-display font-bold text-xs text-foreground truncate max-w-[200px] md:max-w-md">
                {currentSession?.title || "New Chat"}
              </span>
              {role === "admin" && (
                <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30 text-[10px]">
                  Full Database Access
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeepThinking(!isDeepThinking)}
              className={`h-7 px-2.5 rounded-full text-[11px] gap-1.5 font-semibold transition-all ${
                isDeepThinking
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              <span>Think</span>
            </Button>
          </div>
        </div>

        {/* Chat Thread Container */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 scrollbar-thin">
          
          {/* EMPTY STATE: ChatGPT Centered Greeting */}
          {(!currentSession || currentSession.messages.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center px-4 -mt-8 space-y-8">
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-2"
              >
                <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                  Good to see you, {formattedName}.
                </h1>
                <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                  {role === "admin"
                    ? "Ask me anything about candidate performance, previous tests, company drives, or request a complete placement report with live database forensic accuracy."
                    : role === "company"
                    ? "Manage candidate test submissions, evaluate scoring percentiles, and orchestrate multi-round recruitment drives."
                    : "Your dedicated placement mentor for technical MCQs, coding interviews, resume improvement, and drive schedule prep."}
                </p>
              </motion.div>

              {/* Starter Suggestion Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left"
              >
                {starterPrompts.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="group p-4 rounded-2xl bg-card border border-border/70 hover:border-primary/50 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transform group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                        {item.prompt}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>

            </div>
          ) : (
            /* CONVERSATION MESSAGE LIST */
            <div className="max-w-3xl mx-auto space-y-6 pb-6">
              {currentSession.messages.map((msg) => {
                const isUser = msg.sender === "user";

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3.5 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="h-8 w-8 rounded-xl bg-[#5b51d8] text-white flex items-center justify-center shadow-sm shrink-0 mt-0.5">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}

                    <div className={`space-y-1.5 max-w-[85%] md:max-w-[80%]`}>
                      <div
                        className={`p-4 rounded-2xl text-sm leading-relaxed ${
                          isUser
                            ? "bg-[#5b51d8] text-white rounded-br-sm shadow-md font-medium"
                            : "bg-card border border-border/70 text-foreground rounded-bl-sm shadow-sm"
                        }`}
                      >
                        {isUser ? (
                          <div className="whitespace-pre-wrap">{msg.text}</div>
                        ) : (
                          <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed break-words">
                            <ReactMarkdown
                              components={{
                                table: ({ node, ...props }) => (
                                  <div className="overflow-x-auto my-3 rounded-xl border border-border/70">
                                    <table className="min-w-full divide-y divide-border text-xs" {...props} />
                                  </div>
                                ),
                                th: ({ node, ...props }) => (
                                  <th className="bg-muted/50 px-3 py-2 text-left font-bold text-foreground" {...props} />
                                ),
                                td: ({ node, ...props }) => (
                                  <td className="px-3 py-2 border-t border-border/40 text-muted-foreground" {...props} />
                                ),
                                code: ({ node, className, children, ...props }: any) => (
                                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-primary font-semibold" {...props}>
                                    {children}
                                  </code>
                                ),
                                pre: ({ node, children, ...props }: any) => (
                                  <div className="relative my-3 rounded-xl bg-slate-950 p-4 border border-border/60 text-slate-100 overflow-x-auto">
                                    <pre {...props}>{children}</pre>
                                  </div>
                                ),
                              }}
                            >
                              {msg.text}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>

                      {/* Message Footer: Actions & Timestamp */}
                      <div className={`flex items-center gap-2 text-[10px] text-muted-foreground px-1 ${isUser ? "justify-end" : "justify-start"}`}>
                        <span>{msg.timestamp}</span>
                        {!isUser && (
                          <>
                            <span>•</span>
                            <button
                              onClick={() => copyText(msg.id, msg.text)}
                              className="hover:text-foreground flex items-center gap-1 transition-colors"
                              title="Copy response"
                            >
                              {copiedId === msg.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                              <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                            </button>
                            <span>•</span>
                            <button
                              onClick={() => toggleSpeech(msg.id, msg.text)}
                              className="hover:text-foreground flex items-center gap-1 transition-colors"
                              title="Listen aloud"
                            >
                              {ttsActiveId === msg.id && isSpeaking ? (
                                <>
                                  <VolumeX className="h-3 w-3 text-primary animate-pulse" />
                                  <span>Stop</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="h-3 w-3" />
                                  <span>Listen</span>
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isUser && (
                      <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#5b51d8] to-[#8075ff] text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0 mt-0.5">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {/* Typing / Generating Indicator */}
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3"
                >
                  <div className="h-8 w-8 rounded-xl bg-[#5b51d8] text-white flex items-center justify-center shadow-sm shrink-0">
                    <Bot className="h-4 w-4 animate-bounce" />
                  </div>
                  <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-sm flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground font-medium">
                      {isDeepThinking ? "Thinking deeply and analyzing database signals…" : "Synthesizing forensic intelligence…"}
                    </span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

        </div>

        {/* 3. Bottom ChatGPT Floating Input Bar */}
        <div className="p-4 md:pb-6 bg-gradient-to-t from-background via-background to-transparent shrink-0">
          <div className="max-w-3xl mx-auto">
            
            <div className="relative flex items-end rounded-3xl bg-card border border-border/80 shadow-md focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all p-2 pl-4">
              
              {/* Left Action / Attach button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleSendMessage("Generate a complete placement drive report")}
                      className="h-9 w-9 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center shrink-0 mb-0.5 transition-colors"
                      title="Quick prompt"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Quick Placement Actions</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about students, tests, drives, reports…"
                rows={1}
                className="flex-1 max-h-32 min-h-[40px] resize-none bg-transparent py-2.5 px-3 text-sm focus:outline-none placeholder:text-muted-foreground text-foreground"
              />

              {/* Right Action Icons: Think, Mic, Send */}
              <div className="flex items-center gap-1.5 shrink-0 mb-0.5 pr-1">
                {/* Voice Input Mic */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={isListening ? stopListening : startListening}
                        className={`h-9 w-9 rounded-full transition-colors ${
                          isListening
                            ? "bg-destructive text-white animate-pulse"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isListening ? "Stop listening" : "Voice input"}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Send Button */}
                <Button
                  type="button"
                  size="icon"
                  disabled={!input.trim() || isProcessing}
                  onClick={() => handleSendMessage()}
                  className="h-9 w-9 rounded-full bg-[#5b51d8] hover:bg-[#4d43cc] text-white disabled:opacity-40 transition-all shadow-sm"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>

            </div>

            <p className="text-[10px] text-center text-muted-foreground mt-2">
              Placement AI can make mistakes. Verify critical placement statistics and forensic audit logs before publishing.
            </p>

          </div>
        </div>

      </main>

    </div>
  );
}
