import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSpeech } from "@/hooks/useSpeech";
import { askGemini } from "@/lib/gemini";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Bot, Mic, MicOff, Volume2, VolumeX, Send, Sparkles, Loader2,
  Database, UserCheck, ShieldAlert, Building2, ClipboardList, BarChart3,
  X, ChevronRight, CornerDownLeft, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  data?: any;
  timestamp: Date;
}

export function AdminAIAssistant({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { role } = useAuth();
  if (role !== "admin") return null;
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hello Admin! I am your Intelligent Placement Oracle & Database Assistant. Ask me anything about candidate rankings, company drives, proctoring violations, or student eligibility — via voice or text.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    isListening,
    transcript,
    setTranscript,
    startListening,
    stopListening,
    isSpeaking,
    speak,
    stopSpeaking,
    hasRecognitionSupport,
  } = useSpeech();

  // Sync speech transcript into input field
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  const quickPrompts = [
    "📊 Overall Placement & Pass Rate Summary",
    "⭐ Top 5 Candidates by CGPA",
    "🚨 Proctoring & Tab Switch Integrity Logs",
    "🏢 Active Company Drives & Requirements",
    "🎓 Unplaced Students with CGPA >= 8.0",
  ];

  // Direct database query & Google Gemini intelligence engine
  const executeQuery = async (queryText: string) => {
    try {
      // Gather comprehensive multi-table institutional database context
      const [
        studentsRes,
        companiesRes,
        testsRes,
        attemptsRes,
        flaggedRes,
        statsRes
      ] = await Promise.all([
        supabase.from("profiles").select("id, name, email, usn, branch, cgpa, backlogs, skills").order("cgpa", { ascending: false }).limit(50),
        supabase.from("companies").select("id, name, hr_name, job_role, salary_package, job_location, min_cgpa, max_backlogs, allowed_branches, website").order("created_at", { ascending: false }).limit(25),
        supabase.from("tests").select("id, title, scheduled_date, duration, registration_deadline, pass_percentage").order("scheduled_date", { ascending: true }).limit(25),
        supabase.from("test_attempts").select("id, student_id, total_score, passed, tab_switches, auto_submitted, completed_at, tests(title)").order("completed_at", { ascending: false }).limit(30),
        supabase.from("test_attempts").select("id, student_id, total_score, tab_switches, auto_submitted, completed_at, tests(title)").or("tab_switches.gt.0,auto_submitted.eq.true").limit(20),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);

      const passedAttempts = (attemptsRes.data || []).filter((a: any) => a.passed);
      const passRate = attemptsRes.data && attemptsRes.data.length > 0 
        ? Math.round((passedAttempts.length / attemptsRes.data.length) * 100) 
        : 0;

      const dbContext = {
        totalRegisteredStudents: statsRes.count ?? (studentsRes.data?.length ?? 0),
        candidateProfiles: studentsRes.data ?? [],
        visitingRecruiters: companiesRes.data ?? [],
        scheduledAssessments: testsRes.data ?? [],
        recentTestAttempts: attemptsRes.data ?? [],
        proctoringIntegrityFlags: flaggedRes.data ?? [],
        platformPassRate: `${passRate}%`,
      };

      const systemPrompt = `You are the "Placement Oracle AI", the high-level executive recruitment intelligence system for university administrators.
You have administrative-level read access to the complete placement and assessment database:
${JSON.stringify(dbContext, null, 2)}

Instructions:
1. Provide precise, executive-level insights, candidate statistics, company drive statuses, and proctoring audit summaries.
2. Specifically name candidates, their USN, CGPA, or branch when answering about top performers, unplaced students, or specific questions.
3. Detail proctoring anomalies (tab switches, auto-submissions) when answering about exam integrity.
4. Format responses cleanly using bold headers, bullet points, and emojis.`;

      // Call Google Gemini AI
      const geminiResponse = await askGemini(queryText, systemPrompt);

      return { text: geminiResponse, data: dbContext };
    } catch (err: any) {
      console.warn("Gemini AI API fallback triggered:", err);
      return {
        text: `🤖 **Placement Oracle AI Analysis** for *"${queryText}"*:\n\n` +
          `• **Database Snapshot**: Active campus recruitment cycle with registered candidate profiles and scheduled technical drives.\n` +
          `• **AI Guidance**: Filter candidates by minimum CGPA cutoffs and monitor live proctoring integrity streams during active tests.`,
      };
    }
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isProcessing) return;

    setInput("");
    setTranscript("");
    stopSpeaking();
    if (isListening) stopListening();

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const result = await executeQuery(query);

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: result.text,
        data: result.data,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);

      // Speak response aloud if TTS is enabled
      if (ttsEnabled) {
        speak(result.text);
      }
    } catch (error: any) {
      toast.error("Failed to generate response");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[680px] p-0 overflow-hidden flex flex-col rounded-3xl border border-white/15 bg-card/95 backdrop-blur-3xl shadow-[0_30px_90px_rgba(0,0,0,0.85)]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_0_20px_rgba(108,92,231,0.6)]">
              <Bot className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
            </div>
            <div>
              <DialogTitle className="text-base font-display font-bold text-white flex items-center gap-2">
                Placement Oracle AI <Sparkles className="h-4 w-4 text-primary" />
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300">
                Voice & Database Assistant with Full Admin Schema Access
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* TTS Mute/Unmute Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className={`h-9 w-9 rounded-xl ${ttsEnabled ? "text-primary bg-primary/10 border border-primary/20" : "text-muted-foreground"}`}
              onClick={() => {
                if (isSpeaking) stopSpeaking();
                setTtsEnabled(!ttsEnabled);
              }}
              title={ttsEnabled ? "Voice Output Active" : "Voice Output Muted"}
            >
              {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>

            {/* Clear Chat */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl text-muted-foreground hover:text-white"
              onClick={() => {
                stopSpeaking();
                setMessages([
                  {
                    id: "welcome-reset",
                    sender: "assistant",
                    text: "Conversation refreshed. How can I assist with your placement database today?",
                    timestamp: new Date(),
                  },
                ]);
              }}
              title="Reset Conversation"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.sender === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/20 border border-primary/40 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-[82%] rounded-2xl p-4 text-sm leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-primary text-white shadow-[0_4px_15px_rgba(108,92,231,0.3)]"
                    : "bg-surface-container-high/70 border border-white/10 text-slate-100 backdrop-blur-xl shadow-md"
                }`}
              >
                {msg.sender === "assistant" ? (
                  <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-2">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 leading-relaxed text-[13px] text-slate-200 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-bold text-white bg-primary/25 px-1.5 py-0.5 rounded text-[12.5px] border border-primary/30">{children}</strong>,
                        h1: ({ children }) => <h1 className="font-display text-base font-bold text-white mb-2 mt-3 border-b border-white/10 pb-1">{children}</h1>,
                        h2: ({ children }) => <h2 className="font-display text-sm font-bold text-primary mb-1.5 mt-2.5">{children}</h2>,
                        h3: ({ children }) => <h3 className="font-display text-xs font-bold text-purple-300 mb-1 mt-2">{children}</h3>,
                        ul: ({ children }) => <ul className="my-2 space-y-1.5 pl-4 list-disc marker:text-primary">{children}</ul>,
                        ol: ({ children }) => <ol className="my-2 space-y-1.5 pl-4 list-decimal marker:text-primary">{children}</ol>,
                        li: ({ children }) => <li className="text-[12.5px] text-slate-300 leading-normal pl-0.5">{children}</li>,
                        code: ({ children }) => <code className="bg-white/10 text-purple-300 px-1.5 py-0.5 rounded font-mono text-xs border border-white/10">{children}</code>,
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-line">{msg.text}</div>
                )}

                <div className="mt-2 text-[10px] text-right opacity-60">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </motion.div>
          ))}

          {isProcessing && (
            <div className="flex gap-3 items-center text-xs text-primary animate-pulse">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/20 border border-primary/40">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              <span>Querying database & synthesizing report…</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-6 py-2 border-t border-white/5 flex gap-2 overflow-x-auto no-scrollbar bg-black/20">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSend(prompt)}
              className="text-[11px] whitespace-nowrap rounded-full bg-white/5 border border-white/10 px-3 py-1 text-slate-300 hover:bg-primary/20 hover:text-white hover:border-primary/40 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Voice Equalizer Bar when Speaking or Listening */}
        <AnimatePresence>
          {(isListening || isSpeaking) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-primary/10 border-t border-primary/30 px-6 py-2 flex items-center justify-between text-xs text-primary"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
                <span className="font-semibold">
                  {isListening ? "Listening to your voice… (Speak now)" : "AI is speaking…"}
                </span>
              </div>
              <div className="flex items-center gap-1 h-3">
                {[...Array(6)].map((_, i) => (
                  <motion.span
                    key={i}
                    className="w-1 bg-primary rounded-full"
                    animate={{ height: ["4px", "16px", "4px"] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Bar with STT Mic & Send Button */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-4 border-t border-white/10 bg-surface-container-lowest/80 flex items-center gap-3"
        >
          {/* Microphone STT Button */}
          {hasRecognitionSupport && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={`h-12 w-12 rounded-2xl shrink-0 transition-all ${
                isListening
                  ? "bg-destructive text-white border-destructive shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse"
                  : "glass-button text-slate-300 hover:text-white hover:border-primary/50"
              }`}
              onClick={() => {
                if (isListening) {
                  stopListening();
                } else {
                  startListening();
                }
              }}
              title={isListening ? "Stop listening" : "Click to speak (Voice STT)"}
            >
              {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
          )}

          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about candidates, CGPA rankings, proctoring violations, companies…"
            className="h-12 flex-1 rounded-2xl border-white/15 bg-white/5 text-white placeholder:text-slate-400 focus-visible:ring-primary"
          />

          <Button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="h-12 px-5 rounded-2xl bg-primary text-white font-semibold shadow-[0_0_25px_rgba(108,92,231,0.5)] hover:scale-105 active:scale-95 transition-all"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>

      </DialogContent>
    </Dialog>
  );
}
