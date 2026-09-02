import { useEffect, useState, useCallback } from "react";
import { useAuditLog } from "@/hooks/useAuditLog";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Eye, Sparkles, Upload, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

type Test = Tables<"tests">;
type Company = Tables<"companies">;

interface Question {
  id: string;
  type: "mcq" | "coding";
  subject: string;
  topic: string;
  text: string;
  options?: string[];
  correct_answer: string;
  points: number;
}

interface PassCriteria {
  min_score_percent: number;
}

// Helper: format Date to local datetime-local value
function toLocalDatetimeString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

// Helper: format ISO string to IST 12-hour display
function formatToIST12hr(isoString: string): string {
  const date = new Date(isoString);
  return format(date, "MMM d, yyyy h:mm a");
}

// Helper: convert local datetime-local value to ISO with proper timezone
function localDatetimeToISO(localStr: string): string {
  const date = new Date(localStr);
  return date.toISOString();
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
}

export default function AdminTests() {
  const { log: auditLog } = useAuditLog();
  const [tests, setTests] = useState<Test[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Test | null>(null);
  const [viewingTest, setViewingTest] = useState<Test | null>(null);
  const [attempts, setAttempts] = useState<Tables<"test_attempts">[]>([]);

  const GADGET_CLASS_OPTIONS = ["cell phone", "laptop", "tv", "remote", "keyboard", "mouse", "tablet", "book"];

  const [form, setForm] = useState({
    title: "",
    scheduled_date: "",
    duration: "60",
    max_participants: "100",
    company_id: "",
    questions_per_student: "25",
    min_score_percent: "60",
    warning_delay_seconds: "5",
    second_offense_action: "submit" as "submit" | "warn",
    detection_interval_ms: "1500",
    confidence_threshold: "0.55",
    consecutive_frames: "1",
    watched_classes: [...GADGET_CLASS_OPTIONS] as string[],
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [retakeQuestions, setRetakeQuestions] = useState<Question[]>([]);
  const [qForm, setQForm] = useState<Partial<Question>>({
    type: "mcq", subject: "", topic: "", text: "", options: ["", "", "", ""], correct_answer: "", points: 1,
  });

  const [aiSubject, setAiSubject] = useState("");
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState("5");
  const [aiType, setAiType] = useState<"mcq" | "coding">("mcq");
  const [aiLoading, setAiLoading] = useState(false);

  const [fileLoading, setFileLoading] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const fetchTests = async () => {
    const { data } = await supabase.from("tests").select("*").order("scheduled_date", { ascending: false });
    setTests(data ?? []);
  };

  const fetchCompanies = async () => {
    const { data } = await supabase.from("companies").select("*").order("name");
    setCompanies(data ?? []);
  };

  useEffect(() => { fetchTests(); fetchCompanies(); }, []);

  const resetForm = () => {
    setForm({ title: "", scheduled_date: "", duration: "60", max_participants: "100", company_id: "", questions_per_student: "25", min_score_percent: "60", warning_delay_seconds: "5", second_offense_action: "submit", detection_interval_ms: "1500", confidence_threshold: "0.55", consecutive_frames: "1", watched_classes: [...GADGET_CLASS_OPTIONS] });
    setQuestions([]);
    setRetakeQuestions([]);
    setEditing(null);
    setEditingQuestion(null);
  };

  const addQuestion = () => {
    if (!qForm.text?.trim() || !qForm.subject?.trim()) { toast.error("Question text and subject are required"); return; }
    const newQ: Question = {
      id: crypto.randomUUID(),
      type: qForm.type as "mcq" | "coding",
      subject: qForm.subject!,
      topic: qForm.topic || "",
      text: qForm.text!,
      options: qForm.type === "mcq" ? (qForm.options || []).filter(Boolean) : undefined,
      correct_answer: qForm.correct_answer || "",
      points: qForm.points || 1,
    };
    setQuestions([...questions, newQ]);
    setQForm({ type: "mcq", subject: "", topic: "", text: "", options: ["", "", "", ""], correct_answer: "", points: 1 });
    toast.success("Question added");
  };

  const removeQuestion = (id: string) => setQuestions(questions.filter((q) => q.id !== id));

  const startEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setQForm({ ...q, options: q.options || ["", "", "", ""] });
  };

  const saveEditQuestion = () => {
    if (!editingQuestion || !qForm.text?.trim()) return;
    setQuestions(questions.map((q) =>
      q.id === editingQuestion.id
        ? { ...q, type: qForm.type as "mcq" | "coding", subject: qForm.subject!, topic: qForm.topic || "", text: qForm.text!, options: qForm.type === "mcq" ? (qForm.options || []).filter(Boolean) : undefined, correct_answer: qForm.correct_answer || "", points: qForm.points || 1 }
        : q
    ));
    setEditingQuestion(null);
    setQForm({ type: "mcq", subject: "", topic: "", text: "", options: ["", "", "", ""], correct_answer: "", points: 1 });
    toast.success("Question updated");
  };

  const cancelEditQuestion = () => {
    setEditingQuestion(null);
    setQForm({ type: "mcq", subject: "", topic: "", text: "", options: ["", "", "", ""], correct_answer: "", points: 1 });
  };

  const handleGenerateAI = async () => {
    if (!aiSubject.trim()) { toast.error("Subject is required"); return; }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: { subject: aiSubject, topic: aiTopic, count: parseInt(aiCount) || 5, type: aiType },
      });
      if (error) throw error;
      const generated = (data?.questions || []) as Question[];
      setQuestions([...questions, ...generated]);
      toast.success(`${generated.length} questions generated by AI`);
    } catch (err) {
      toast.error("Failed to generate questions: " + (err as Error).message);
    }
    setAiLoading(false);
  };

  // Support PDF, Word, and other file types
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [".pdf", ".doc", ".docx", ".txt", ".rtf"];
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
    if (!allowedTypes.includes(ext)) {
      toast.error("Supported formats: PDF, Word (.doc, .docx), TXT, RTF");
      return;
    }

    setFileLoading(true);
    try {
      let pdfText = "";
      let documentBase64 = "";
      let mimeType = file.type || "application/octet-stream";

      if (ext === ".pdf") {
        // Try text extraction first
        const arrayBuffer = await file.arrayBuffer();
        try {
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: unknown) => {
              const it = item as Record<string, unknown>;
              return typeof it.str === 'string' ? it.str : '';
            }).join(" ");
            pdfText += pageText + "\n\n";
          }
        } catch {
          // PDF parsing failed, fall back to vision
        }

        // If text extraction yielded minimal content, use vision fallback
        if (pdfText.replace(/\s+/g, " ").trim().length < 50) {
          documentBase64 = arrayBufferToBase64(arrayBuffer);
          mimeType = "application/pdf";
          pdfText = "";
        }
      } else {
        // For Word docs and other formats, send as base64 for vision API
        const arrayBuffer = await file.arrayBuffer();
        documentBase64 = arrayBufferToBase64(arrayBuffer);
        if (ext === ".txt") {
          // Text files can be read directly
          pdfText = new TextDecoder().decode(arrayBuffer);
          documentBase64 = "";
        }
      }

      const { data, error } = await supabase.functions.invoke("extract-questions-pdf", {
        body: {
          pdfText: pdfText ? pdfText.slice(0, 30000) : undefined,
          documentBase64: documentBase64 || undefined,
          mimeType: documentBase64 ? mimeType : undefined,
        },
      });
      if (error) throw error;
      const extracted = (data?.questions || []) as Question[];
      setQuestions([...questions, ...extracted]);
      toast.success(`${extracted.length} questions extracted from ${file.name}`);
    } catch (err) {
      toast.error("Failed to extract questions: " + (err as Error).message);
    }
    setFileLoading(false);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.scheduled_date) { toast.error("Title and scheduled date are required"); return; }
    const passCriteria: PassCriteria = { min_score_percent: parseInt(form.min_score_percent) || 60 };

    // Convert local datetime to ISO
    const scheduledISO = localDatetimeToISO(form.scheduled_date);

    const parsedThreshold = parseFloat(form.confidence_threshold);
    const parsedFrames = parseInt(form.consecutive_frames);
    const proctorConfig = {
      warning_delay_seconds: parseInt(form.warning_delay_seconds) || 5,
      second_offense_action: form.second_offense_action,
      detection_interval_ms: parseInt(form.detection_interval_ms) || 1500,
      confidence_threshold: Number.isFinite(parsedThreshold) ? Math.min(0.95, Math.max(0.1, parsedThreshold)) : 0.55,
      consecutive_frames: Number.isFinite(parsedFrames) ? Math.min(10, Math.max(1, parsedFrames)) : 1,
      watched_classes: form.watched_classes,
    };

    const payload = {
      title: form.title,
      scheduled_date: scheduledISO,
      duration: parseInt(form.duration) || 60,
      max_participants: parseInt(form.max_participants) || null,
      company_id: form.company_id || null,
      questions_per_student: parseInt(form.questions_per_student) || 25,
      question_bank: JSON.parse(JSON.stringify(questions)),
      retake_question_bank: JSON.parse(JSON.stringify(retakeQuestions)),
      pass_criteria: JSON.parse(JSON.stringify(passCriteria)),
      proctor_config: JSON.parse(JSON.stringify(proctorConfig)),
    } as Record<string, unknown>;

    if (editing) {
      const { error } = await (supabase.from("tests") as any).update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Test updated");
      auditLog("test_updated", "tests", editing.id, { title: form.title });
    } else {
      const { data: newTest, error } = await (supabase.from("tests") as any).insert(payload).select().single();
      if (error) { toast.error(error.message); return; }
      toast.success("Test created");
      auditLog("test_created", "tests", newTest.id, { title: form.title });

      // Send email notifications
      try {
        const displayDate = formatToIST12hr(scheduledISO);
        await supabase.functions.invoke("send-test-notification", {
          body: { testId: newTest.id, testTitle: form.title, scheduledDate: displayDate },
        });
        toast.success("Email notifications sent to students");
      } catch {
        toast.info("Test created but notifications could not be sent");
      }
    }
    setOpen(false);
    resetForm();
    fetchTests();
  };

  const handleEdit = (t: Test) => {
    const criteria = (t.pass_criteria as Record<string, number>) ?? {};
    const proctorCfg = ((t as unknown as { proctor_config?: { warning_delay_seconds?: number; second_offense_action?: "submit" | "warn"; detection_interval_ms?: number; confidence_threshold?: number; consecutive_frames?: number; watched_classes?: string[] } }).proctor_config) ?? {};
    const localDate = toLocalDatetimeString(new Date(t.scheduled_date));
    setForm({
      title: t.title,
      scheduled_date: localDate,
      duration: String(t.duration),
      max_participants: String(t.max_participants ?? ""),
      company_id: t.company_id ?? "",
      questions_per_student: String(t.questions_per_student ?? "25"),
      min_score_percent: String(criteria.min_score_percent ?? "60"),
      warning_delay_seconds: String(proctorCfg.warning_delay_seconds ?? 5),
      second_offense_action: (proctorCfg.second_offense_action ?? "submit"),
      detection_interval_ms: String(proctorCfg.detection_interval_ms ?? 1500),
      confidence_threshold: String(proctorCfg.confidence_threshold ?? 0.55),
      consecutive_frames: String(proctorCfg.consecutive_frames ?? 1),
      watched_classes: Array.isArray(proctorCfg.watched_classes) && proctorCfg.watched_classes.length ? proctorCfg.watched_classes : [...GADGET_CLASS_OPTIONS],
    });
    setQuestions(((t.question_bank as unknown as Question[]) ?? []));
    setRetakeQuestions((((t as unknown as { retake_question_bank?: Question[] }).retake_question_bank)) ?? []);
    setEditing(t);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("tests").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Test deleted");
    auditLog("test_deleted", "tests", id);
    fetchTests();
  };

  const handleViewResults = async (t: Test) => {
    setViewingTest(t);
    const { data } = await supabase.from("test_attempts").select("*").eq("test_id", t.id).order("total_score", { ascending: false });
    setAttempts(data ?? []);
  };

  const filtered = tests.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Management</h1>
          <p className="text-muted-foreground">Create and manage placement tests</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Create Test</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Test" : "Create Test"}</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="details" className="mt-2">
              <TabsList className="w-full">
                <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                <TabsTrigger value="questions" className="flex-1">Questions ({questions.length})</TabsTrigger>
                <TabsTrigger value="retake" className="flex-1">Retake Bank ({retakeQuestions.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Test Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. TCS Aptitude Round 1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Scheduled Date & Time (IST)</Label>
                    <Input type="datetime-local" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
                    <p className="text-xs text-muted-foreground">Time is in IST (Asia/Kolkata) — 12hr format will be displayed</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (minutes)</Label>
                    <Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Participants</Label>
                    <Input type="number" value={form.max_participants} onChange={(e) => setForm({ ...form, max_participants: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Questions per Student</Label>
                    <Input type="number" value={form.questions_per_student} onChange={(e) => setForm({ ...form, questions_per_student: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company (optional)</Label>
                    <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                      <SelectContent>
                        {companies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Pass Criteria (min %)</Label>
                    <Input type="number" value={form.min_score_percent} onChange={(e) => setForm({ ...form, min_score_percent: e.target.value })} />
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold">Proctor Settings</h4>
                    <p className="text-xs text-muted-foreground">Configure the webcam-based gadget detection for this test.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Warning grace (sec)</Label>
                      <Input type="number" value={form.warning_delay_seconds} onChange={(e) => setForm({ ...form, warning_delay_seconds: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Detection interval (ms)</Label>
                      <Input type="number" value={form.detection_interval_ms} onChange={(e) => setForm({ ...form, detection_interval_ms: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>2nd offense</Label>
                      <Select value={form.second_offense_action} onValueChange={(v) => setForm({ ...form, second_offense_action: v as "submit" | "warn" })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="submit">Auto-submit</SelectItem>
                          <SelectItem value="warn">Warn again</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Detection sensitivity</Label>
                        <span className="text-xs text-muted-foreground font-mono">{parseFloat(form.confidence_threshold || "0.55").toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0.3}
                        max={0.9}
                        step={0.05}
                        value={form.confidence_threshold}
                        onChange={(e) => setForm({ ...form, confidence_threshold: e.target.value })}
                        className="w-full accent-primary"
                      />
                      <p className="text-[10px] text-muted-foreground">Lower = more detections (more false alarms). Higher = stricter matches only.</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Consecutive frames</Label>
                        <span className="text-xs text-muted-foreground font-mono">{form.consecutive_frames}</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={form.consecutive_frames}
                        onChange={(e) => setForm({ ...form, consecutive_frames: e.target.value })}
                        className="w-full accent-primary"
                      />
                      <p className="text-[10px] text-muted-foreground">Number of frames in a row that must detect a gadget before a warning fires.</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <Label>Watched gadget classes</Label>
                    <p className="text-[10px] text-muted-foreground">Unchecked items will not trigger warnings for this test.</p>
                    <div className="grid grid-cols-4 gap-2">
                      {GADGET_CLASS_OPTIONS.map((cls) => {
                        const checked = form.watched_classes.includes(cls);
                        return (
                          <label key={cls} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs cursor-pointer hover:bg-accent">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...form.watched_classes, cls]
                                  : form.watched_classes.filter((c) => c !== cls);
                                setForm({ ...form, watched_classes: next });
                              }}
                            />
                            <span className="capitalize">{cls}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
                </div>
              </TabsContent>


              <TabsContent value="questions" className="space-y-4 pt-4">
                {/* AI Generation & File Upload */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="space-y-3 pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-semibold">Generate with AI</h4>
                      </div>
                      <Input placeholder="Subject (e.g. Aptitude)" value={aiSubject} onChange={(e) => setAiSubject(e.target.value)} />
                      <Input placeholder="Topic (optional)" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} />
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={aiType} onValueChange={(v) => setAiType(v as "mcq" | "coding")}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mcq">MCQ</SelectItem>
                            <SelectItem value="coding">Coding</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input type="number" placeholder="Count" value={aiCount} onChange={(e) => setAiCount(e.target.value)} />
                      </div>
                      <Button onClick={handleGenerateAI} disabled={aiLoading} className="w-full">
                        {aiLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate Questions</>}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="space-y-3 pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Upload className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-semibold">Upload Question Bank</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">Upload a PDF, Word (.doc/.docx), or text file. AI will extract and structure questions automatically.</p>
                      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center hover:border-primary/50 transition-colors">
                        {fileLoading ? (
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : (
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        )}
                        <p className="text-sm">{fileLoading ? "Extracting questions…" : "Click to upload file"}</p>
                        <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, TXT, RTF</p>
                        <input type="file" accept=".pdf,.doc,.docx,.txt,.rtf" className="hidden" onChange={handleFileUpload} disabled={fileLoading} />
                      </label>
                    </CardContent>
                  </Card>
                </div>

                {/* Manual Add / Edit Question */}
                <Card>
                  <CardContent className="space-y-4 pt-4">
                    <h4 className="text-sm font-semibold">{editingQuestion ? "Edit Question" : "Add Question Manually"}</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={qForm.type} onValueChange={(v) => setQForm({ ...qForm, type: v as "mcq" | "coding" })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mcq">MCQ</SelectItem>
                            <SelectItem value="coding">Coding</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Subject</Label>
                        <Input value={qForm.subject ?? ""} onChange={(e) => setQForm({ ...qForm, subject: e.target.value })} placeholder="e.g. Aptitude" />
                      </div>
                      <div className="space-y-2">
                        <Label>Topic</Label>
                        <Input value={qForm.topic ?? ""} onChange={(e) => setQForm({ ...qForm, topic: e.target.value })} placeholder="e.g. Percentages" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Question Text</Label>
                      <Textarea value={qForm.text ?? ""} onChange={(e) => setQForm({ ...qForm, text: e.target.value })} rows={2} />
                    </div>
                    {qForm.type === "mcq" && (
                      <div className="grid grid-cols-2 gap-3">
                        {(qForm.options || []).map((opt, i) => (
                          <div key={i} className="space-y-1">
                            <Label>Option {String.fromCharCode(65 + i)}</Label>
                            <Input value={opt} onChange={(e) => { const opts = [...(qForm.options || [])]; opts[i] = e.target.value; setQForm({ ...qForm, options: opts }); }} />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Correct Answer</Label>
                        <Input value={qForm.correct_answer ?? ""} onChange={(e) => setQForm({ ...qForm, correct_answer: e.target.value })} placeholder={qForm.type === "mcq" ? "e.g. A" : "Expected output"} />
                      </div>
                      <div className="space-y-2">
                        <Label>Points</Label>
                        <Input type="number" value={qForm.points ?? 1} onChange={(e) => setQForm({ ...qForm, points: parseInt(e.target.value) || 1 })} />
                      </div>
                    </div>
                    {editingQuestion ? (
                      <div className="flex gap-2">
                        <Button onClick={saveEditQuestion} className="flex-1">Save Changes</Button>
                        <Button onClick={cancelEditQuestion} variant="outline" className="flex-1">Cancel</Button>
                      </div>
                    ) : (
                      <Button onClick={addQuestion} className="w-full"><Plus className="mr-2 h-4 w-4" /> Add Question</Button>
                    )}
                  </CardContent>
                </Card>

                {questions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Question Bank ({questions.length})</h4>
                    {questions.map((q, i) => (
                      <div key={q.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-medium text-muted-foreground">#{i + 1}</span>
                          <Badge variant="secondary">{q.type.toUpperCase()}</Badge>
                          <Badge variant="outline">{q.subject}</Badge>
                          <span className="truncate text-sm">{q.text}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => startEditQuestion(q)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="retake" className="space-y-4 pt-4">
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <p className="font-medium">Retake question bank</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Students retaking this test will receive a randomized set drawn from this bank instead of the main bank.
                    Leave empty to reuse the main bank for retakes.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setRetakeQuestions([...retakeQuestions, ...questions.map((q) => ({ ...q, id: crypto.randomUUID() }))]); toast.success("Copied main bank into retake bank"); }}
                    disabled={questions.length === 0}
                  >
                    Copy from main bank
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!aiSubject.trim()) { toast.error("Enter a subject in the Questions tab first"); return; }
                      setAiLoading(true);
                      try {
                        const { data, error } = await supabase.functions.invoke("generate-questions", {
                          body: { subject: aiSubject, topic: aiTopic, count: parseInt(aiCount) || 5, type: aiType },
                        });
                        if (error) throw error;
                        const generated = (data?.questions || []) as Question[];
                        setRetakeQuestions([...retakeQuestions, ...generated]);
                        toast.success(`${generated.length} retake questions generated`);
                      } catch (err) {
                        toast.error("Failed: " + (err as Error).message);
                      }
                      setAiLoading(false);
                    }}
                    disabled={aiLoading}
                  >
                    {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Generate with AI (uses Questions-tab subject)
                  </Button>
                  {retakeQuestions.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setRetakeQuestions([])}>
                      Clear all
                    </Button>
                  )}
                </div>

                {retakeQuestions.length > 0 ? (
                  <div className="space-y-2">
                    {retakeQuestions.map((q, i) => (
                      <div key={q.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-medium text-muted-foreground">#{i + 1}</span>
                          <Badge variant="secondary">{q.type.toUpperCase()}</Badge>
                          <Badge variant="outline">{q.subject}</Badge>
                          <span className="truncate text-sm">{q.text}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setRetakeQuestions(retakeQuestions.filter((x) => x.id !== q.id))}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No retake questions yet. Students retaking will get the main bank re-shuffled.
                  </p>
                )}
              </TabsContent>
            </Tabs>
            <Button onClick={handleSave} className="mt-4 w-full">{editing ? "Update Test" : "Create Test"}</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search tests…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Date (IST)</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => {
                const qCount = ((t.question_bank as unknown as Question[]) ?? []).length;
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell>{formatToIST12hr(t.scheduled_date)}</TableCell>
                    <TableCell>{t.duration} min</TableCell>
                    <TableCell>{qCount} in bank / {t.questions_per_student ?? qCount} per student</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleViewResults(t)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No tests found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Results Dialog */}
      <Dialog open={!!viewingTest} onOpenChange={(v) => { if (!v) setViewingTest(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Results — {viewingTest?.title}</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Attempt</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attempts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.student_id.slice(0, 8)}…</TableCell>
                  <TableCell>{a.attempt_number}</TableCell>
                  <TableCell>{a.total_score ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={a.passed ? "default" : "destructive"}>
                      {a.passed ? "Passed" : "Failed"}
                    </Badge>
                  </TableCell>
                  <TableCell>{a.completed_at ? formatToIST12hr(a.completed_at) : "In progress"}</TableCell>
                </TableRow>
              ))}
              {attempts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No attempts yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
