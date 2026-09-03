import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Upload, FileText, Loader2, AlertTriangle, CheckCircle2, GraduationCap,
  Sparkles, ShieldCheck, Copy, ExternalLink, Download, UserCheck, Award,
  Mail, Calendar, Briefcase, Trophy, ChevronRight
} from "lucide-react";

interface MarksCardEntry {
  semester: number;
  path: string;
  sgpa: number | null;
  verified: boolean;
  uploadedAt: string;
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

export default function StudentProfile() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: "",
    yearOfPassing: "",
    usn: "",
    branch: "",
    skills: "",
    title: "Full Stack Developer",
  });
  const [completion, setCompletion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("studio");

  // Marks card state
  const [isLateralEntry, setIsLateralEntry] = useState<boolean | null>(null);
  const [currentSemester, setCurrentSemester] = useState<number | null>(null);
  const [marksCards, setMarksCards] = useState<MarksCardEntry[]>([]);
  const [uploadingSem, setUploadingSem] = useState<number | null>(null);
  const [cgpa, setCgpa] = useState<number | null>(null);
  const [nameAndUsnSaved, setNameAndUsnSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (data) {
        const d = data as Record<string, unknown>;
        setForm({
          name: (d.name as string) ?? "",
          yearOfPassing: d.year_of_passing ? String(d.year_of_passing) : "",
          usn: (d.usn as string) ?? "",
          branch: (d.branch as string) ?? "",
          skills: ((d.skills as string[]) ?? []).join(", "),
          title: (d.headline as string) ?? "Aspiring Software Engineer",
        });
        setCompletion((d.profile_completion_percentage as number) ?? 0);
        setResumeUrl(d.resume_url as string | null);
        setIsLateralEntry(d.is_lateral_entry as boolean | null);
        setCurrentSemester(d.current_semester as number | null);
        setMarksCards(((d.marks_cards as MarksCardEntry[]) ?? []));

        const sgpas = (d.sgpas as Record<string, number>) ?? {};
        const sgpaValues = Object.values(sgpas);
        if (sgpaValues.length > 0) {
          setCgpa(parseFloat((sgpaValues.reduce((a, b) => a + b, 0) / sgpaValues.length).toFixed(2)));
        } else {
          setCgpa(d.cgpa as number | null);
        }

        if ((d.name as string)?.trim() && (d.usn as string)?.trim()) {
          setNameAndUsnSaved(true);
        }
      }
    });
  }, [user]);

  const calcCompletion = () => {
    let score = 0;
    const fields = [form.name.trim(), form.yearOfPassing, form.usn.trim(), form.branch.trim()];
    const totalFields = fields.length + 3; // +1 resume, +1 marks cards, +1 skills
    const perField = 100 / totalFields;
    fields.forEach((f) => { if (f) score += perField; });
    if (resumeUrl) score += perField;
    if (marksCards.length > 0) score += perField;
    if (form.skills.trim()) score += perField;
    return Math.min(Math.round(score), 100);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.name.trim() || !form.usn.trim()) {
      toast.error("Full Name and USN are required");
      return;
    }
    setSaving(true);
    const newCompletion = calcCompletion();

    // Calculate CGPA from SGPAs
    const sgpas: Record<string, number> = {};
    marksCards.forEach(mc => {
      if (mc.sgpa !== null) sgpas[String(mc.semester)] = mc.sgpa;
    });
    const sgpaValues = Object.values(sgpas);
    const calculatedCgpa = sgpaValues.length > 0 ? parseFloat((sgpaValues.reduce((a, b) => a + b, 0) / sgpaValues.length).toFixed(2)) : null;

    const { error } = await supabase.from("profiles").update({
      name: form.name,
      cgpa: calculatedCgpa,
      year_of_passing: parseInt(form.yearOfPassing) || null,
      usn: form.usn || null,
      branch: form.branch || null,
      profile_completion_percentage: newCompletion,
      is_lateral_entry: isLateralEntry,
      current_semester: currentSemester,
      marks_cards: JSON.parse(JSON.stringify(marksCards)),
      sgpas: JSON.parse(JSON.stringify(sgpas)),
      skills: form.skills.split(",").map(s => s.trim()).filter(Boolean),
      headline: form.title,
    } as Record<string, unknown>).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setCompletion(newCompletion);
    setCgpa(calculatedCgpa);
    setNameAndUsnSaved(true);
    toast.success("Profile saved successfully");
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!nameAndUsnSaved) { toast.error("Please save your Full Name and USN first before uploading"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
    if (!file.name.endsWith(".pdf")) { toast.error("Only PDF files are accepted"); return; }

    setUploading(true);
    const fileName = `${form.usn.trim().toUpperCase()}_${form.name.trim().replace(/\s+/g, "_")}.pdf`;
    const path = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage.from("resumes").upload(path, file, { upsert: true });
    if (uploadError) { toast.error("Upload failed: " + uploadError.message); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("resumes").getPublicUrl(path);
    setResumeUrl(publicUrl);

    await supabase.from("profiles").update({
      resume_url: publicUrl,
      profile_completion_percentage: calcCompletion(),
    }).eq("id", user.id);

    setUploading(false);
    toast.success("Resume uploaded successfully");
  };

  const handleMarksCardUpload = async (semester: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!nameAndUsnSaved) { toast.error("Please save your Full Name and USN first"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }

    setUploadingSem(semester);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = arrayBufferToBase64(arrayBuffer);

      const res = await supabase.functions.invoke("verify-marks-card", {
        body: {
          fileBase64: base64Data,
          fileType: file.type || "application/pdf",
          semester,
          expectedUsn: form.usn.trim(),
          expectedName: form.name.trim(),
        },
      });

      if (res.error) throw new Error(res.error.message || "Verification failed");
      const verification = res.data;

      const path = `${user.id}/sem_${semester}_${Date.now()}_${file.name}`;
      await supabase.storage.from("marks-cards").upload(path, file, { upsert: true });

      const newEntry: MarksCardEntry = {
        semester,
        path,
        sgpa: verification.extracted_sgpa ?? null,
        verified: verification.verified ?? false,
        uploadedAt: new Date().toISOString(),
      };

      const updatedCards = [...marksCards.filter(mc => mc.semester !== semester), newEntry].sort((a, b) => a.semester - b.semester);
      setMarksCards(updatedCards);

      const sgpas: Record<string, number> = {};
      updatedCards.forEach(mc => { if (mc.sgpa !== null) sgpas[String(mc.semester)] = mc.sgpa; });
      const sgpaValues = Object.values(sgpas);
      const newCgpa = sgpaValues.length > 0 ? parseFloat((sgpaValues.reduce((a, b) => a + b, 0) / sgpaValues.length).toFixed(2)) : null;

      await supabase.from("profiles").update({
        marks_cards: JSON.parse(JSON.stringify(updatedCards)),
        sgpas: JSON.parse(JSON.stringify(sgpas)),
        cgpa: newCgpa,
      } as Record<string, unknown>).eq("id", user.id);

      setCgpa(newCgpa);
      toast.success(`Semester ${semester} marks card uploaded and verified. SGPA: ${verification.extracted_sgpa ?? 'N/A'}`);
    } catch (err) {
      toast.error("Failed to upload marks card: " + (err as Error).message);
    }

    setUploadingSem(null);
    e.target.value = "";
  };

  const getRequiredSemesters = (): number[] => {
    if (isLateralEntry === null || currentSemester === null) return [];
    const start = isLateralEntry ? 3 : 1;
    const semesters: number[] = [];
    for (let i = start; i <= currentSemester; i++) {
      semesters.push(i);
    }
    return semesters;
  };

  const requiredSemesters = getRequiredSemesters();
  const verifiedSignals = marksCards.filter(m => m.verified).length;
  const skillsCount = form.skills.split(",").filter(s => s.trim().length > 0).length;
  const trustScore = Math.min(100, Math.round((completion * 0.4) + ((cgpa ? cgpa * 10 : 70) * 0.4) + (verifiedSignals > 0 ? 20 : 0)));

  const userInitial = form.name ? form.name.charAt(0).toUpperCase() : (user?.email?.charAt(0).toUpperCase() || "A");
  const publicSlug = form.name ? form.name.toLowerCase().replace(/\s+/g, "") : "candidate";

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* 1. PROFILE COVER BANNER MATCHING ZIDIO IMAGE 5 */}
      <div className="rounded-3xl bg-card border border-border/60 overflow-hidden shadow-sm">
        
        {/* Dark Navy Cover Header */}
        <div className="h-36 md:h-44 bg-gradient-to-r from-[#14142b] via-[#1a1a36] to-[#121224] p-6 flex flex-col justify-between relative">
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Campus Verified • Placement Active</span>
            </div>

            <Badge variant="outline" className="border-white/20 text-white text-[10px] bg-white/5 font-semibold">
              Pro Verified Profile
            </Badge>
          </div>

          <div className="absolute right-8 top-1/2 -translate-y-1/2 w-48 h-48 bg-[#5b51d8]/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Profile Info Row with Overlapping Avatar */}
        <div className="px-6 md:px-8 pb-6 relative">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-14 mb-4">
            
            {/* Avatar & Identifiers */}
            <div className="flex items-end gap-5">
              <div className="h-24 w-24 md:h-28 md:w-28 rounded-3xl bg-gradient-to-tr from-[#5b51d8] to-[#7f74fc] text-white font-display font-black text-4xl flex items-center justify-center border-4 border-card shadow-lg shrink-0">
                {userInitial}
              </div>

              <div className="space-y-1 mb-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
                    {form.name || "Candidate Name"}
                  </h1>
                  <Badge className="bg-[#5b51d8]/15 text-[#5b51d8] border-[#5b51d8]/30 text-[10px]">
                    Verified
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                  <span>{form.title}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {user?.email}
                  </span>
                </p>

                {/* Vanity Slug URL Pill */}
                <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-muted border border-border">
                    <span className="font-mono text-foreground">ipms.edu/p/{user?.id?.slice(0, 8)}</span>
                    <Copy
                      className="h-3 w-3 cursor-pointer hover:text-foreground"
                      onClick={() => {
                        navigator.clipboard.writeText(`https://ipms.edu/p/${user?.id}`);
                        toast.success("Profile link copied to clipboard");
                      }}
                    />
                  </div>
                  <span className="text-emerald-500 font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Public
                  </span>
                  <span className="text-[#5b51d8] font-bold">/{publicSlug} PRO</span>
                </div>
              </div>
            </div>

            {/* Right: Trust Score Widget (Image 5) */}
            <div className="shrink-0 flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-[#131326] text-white border border-white/10 flex items-center gap-3.5 shadow-md">
                <div className="text-center font-display">
                  <div className="text-2xl font-black text-white">{trustScore}</div>
                  <div className="text-[9px] uppercase font-bold tracking-widest text-[#8e85ff]">Score</div>
                </div>
                <div className="border-l border-white/10 pl-3 text-left">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-slate-300">Trust Score</div>
                  <div className="text-[11px] text-slate-400">{verifiedSignals} of {requiredSemesters.length || 8} Verified</div>
                </div>
              </div>
            </div>

          </div>

          {/* Action Button Row */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-border/40">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-[#5b51d8] hover:bg-[#4d43cc] text-white text-xs font-bold h-9 px-4 gap-2 shadow-[0_4px_12px_rgba(91,81,216,0.3)]"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
              Save Profile
            </Button>

            {resumeUrl && (
              <Button
                asChild
                variant="outline"
                className="rounded-xl border-border text-xs font-semibold h-9 px-4 gap-1.5"
              >
                <a href={resumeUrl} target="_blank" rel="noreferrer">
                  <Download className="h-3.5 w-3.5 text-muted-foreground" /> Download Résumé
                </a>
              </Button>
            )}
          </div>

        </div>

      </div>

      {/* 2. 4 METRIC CARDS ROW MATCHING ZIDIO IMAGE 5 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Performance */}
        <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm space-y-2">
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground">
            Performance
          </span>
          <div className="flex items-baseline gap-1.5 font-display">
            <span className="text-2xl font-extrabold text-foreground">
              {cgpa ? Math.round(cgpa * 10) : 75}
            </span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
          <Progress value={cgpa ? cgpa * 10 : 75} className="h-1.5 bg-muted" />
        </div>

        {/* Profile Readiness */}
        <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm space-y-2">
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground">
            Profile Readiness
          </span>
          <div className="flex items-baseline gap-1.5 font-display">
            <span className="text-2xl font-extrabold text-[#5b51d8]">
              {completion}%
            </span>
          </div>
          <Progress value={completion} className="h-1.5 bg-muted [&>div]:bg-[#5b51d8]" />
        </div>

        {/* Verified Signals */}
        <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm space-y-2">
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground">
            Verified Signals
          </span>
          <div className="flex items-baseline gap-1.5 font-display">
            <span className="text-2xl font-extrabold text-foreground">
              {verifiedSignals}
            </span>
            <span className="text-xs text-muted-foreground">/ {requiredSemesters.length || 8}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Marks cards OCR verified</p>
        </div>

        {/* Skills Verified */}
        <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm space-y-2">
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground">
            Skills Listed
          </span>
          <div className="flex items-baseline gap-1.5 font-display">
            <span className="text-2xl font-extrabold text-foreground">
              {skillsCount}
            </span>
            <span className="text-xs text-muted-foreground">skills</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Ready for technical tests</p>
        </div>

      </div>

      {/* 3. STUDIO NAVIGATION TABS (Image 5) */}
      <Tabs defaultValue="studio" className="space-y-6">
        <TabsList className="bg-muted/40 p-1 rounded-2xl border border-border/60 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="studio" className="rounded-xl text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Studio Details
          </TabsTrigger>
          <TabsTrigger value="marks" className="rounded-xl text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Marks &amp; Academic Transcripts
          </TabsTrigger>
          <TabsTrigger value="resume" className="rounded-xl text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            AI Résumé &amp; Documents
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: STUDIO DETAILS */}
        <TabsContent value="studio" className="space-y-6">
          <Card className="rounded-3xl border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Personal &amp; Academic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">Full Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="h-10 rounded-xl bg-muted/30 border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">University Seat Number (USN) *</Label>
                  <Input
                    value={form.usn}
                    onChange={(e) => setForm({ ...form, usn: e.target.value })}
                    placeholder="e.g. 1RV21CS001"
                    className="h-10 rounded-xl bg-muted/30 border-border uppercase font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">Professional Title / Headline</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Full Stack Developer | AI Enthusiast"
                    className="h-10 rounded-xl bg-muted/30 border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">Engineering Branch</Label>
                  <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v })}>
                    <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-border">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Computer Science">Computer Science</SelectItem>
                      <SelectItem value="Information Science">Information Science</SelectItem>
                      <SelectItem value="Electronics & Communication">Electronics &amp; Communication</SelectItem>
                      <SelectItem value="Mechanical">Mechanical</SelectItem>
                      <SelectItem value="Civil">Civil</SelectItem>
                      <SelectItem value="Electrical">Electrical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">Year of Passing</Label>
                  <Input
                    type="number"
                    value={form.yearOfPassing}
                    onChange={(e) => setForm({ ...form, yearOfPassing: e.target.value })}
                    placeholder="e.g. 2026"
                    className="h-10 rounded-xl bg-muted/30 border-border font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">Key Skills (Comma Separated)</Label>
                  <Input
                    value={form.skills}
                    onChange={(e) => setForm({ ...form, skills: e.target.value })}
                    placeholder="e.g. React, TypeScript, Python, Node.js, SQL"
                    className="h-10 rounded-xl bg-muted/30 border-border"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-xl bg-[#5b51d8] hover:bg-[#4d43cc] text-white font-bold text-xs h-9 px-5"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: MARKS & ACADEMIC TRANSCRIPTS */}
        <TabsContent value="marks" className="space-y-6">
          <Card className="rounded-3xl border-border/60 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Semester Transcripts &amp; OCR Verification</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Upload VTU/University marks cards for auto SGPA/CGPA computation.</p>
                </div>
                {cgpa !== null && (
                  <Badge className="bg-[#5b51d8]/15 text-[#5b51d8] border-[#5b51d8]/30 font-mono text-xs">
                    Current CGPA: {cgpa}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/20 border border-border/60">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">Admission Type</Label>
                  <RadioGroup
                    value={isLateralEntry === null ? "" : isLateralEntry ? "lateral" : "regular"}
                    onValueChange={(v) => setIsLateralEntry(v === "lateral")}
                    className="flex gap-4 pt-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="regular" id="regular" />
                      <Label htmlFor="regular" className="text-xs font-medium cursor-pointer">Regular (1st Sem)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="lateral" id="lateral" />
                      <Label htmlFor="lateral" className="text-xs font-medium cursor-pointer">Lateral Entry (3rd Sem)</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">Current Semester</Label>
                  <Select
                    value={currentSemester ? String(currentSemester) : ""}
                    onValueChange={(v) => setCurrentSemester(Number(v))}
                  >
                    <SelectTrigger className="h-9 rounded-xl bg-card border-border text-xs">
                      <SelectValue placeholder="Select current sem" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Upload Grid */}
              {requiredSemesters.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {requiredSemesters.map((sem) => {
                    const card = marksCards.find(mc => mc.semester === sem);
                    const isUploading = uploadingSem === sem;

                    return (
                      <div key={sem} className="p-4 rounded-2xl border border-border/60 bg-muted/10 flex flex-col justify-between gap-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground">Semester {sem}</span>
                          {card?.verified ? (
                            <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Verified
                            </Badge>
                          ) : card ? (
                            <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
                              Uploaded
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Pending
                            </Badge>
                          )}
                        </div>

                        <div className="text-xs">
                          {card?.sgpa !== null && card?.sgpa !== undefined ? (
                            <div className="font-mono text-sm font-bold text-foreground">SGPA: {card.sgpa}</div>
                          ) : (
                            <div className="text-muted-foreground text-[11px]">Marks card not uploaded</div>
                          )}
                        </div>

                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            disabled={isUploading}
                            className="hidden"
                            onChange={(e) => handleMarksCardUpload(sem, e)}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            asChild
                            className="w-full h-8 text-[11px] rounded-xl border-border hover:bg-primary hover:text-white"
                          >
                            <span>
                              {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                              {card ? "Re-upload" : "Upload Card"}
                            </span>
                          </Button>
                        </label>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Select your admission type and current semester above to view marks card upload slots.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: RESUME & DOCUMENTS */}
        <TabsContent value="resume" className="space-y-6">
          <Card className="rounded-3xl border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Resume &amp; Credentials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-6 rounded-2xl border-2 border-dashed border-border/80 text-center space-y-3 bg-muted/5">
                <FileText className="h-10 w-10 text-[#5b51d8] mx-auto opacity-70" />
                <div>
                  <h4 className="font-bold text-sm text-foreground">Upload Master Placement Résumé</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">PDF format only, maximum 5MB.</p>
                </div>

                <label className="inline-block cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf"
                    disabled={uploading}
                    onChange={handleResumeUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    asChild
                    className="rounded-xl bg-[#5b51d8] hover:bg-[#4d43cc] text-white text-xs font-bold h-9 px-5 gap-2 shadow-sm"
                  >
                    <span>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Choose PDF File
                    </span>
                  </Button>
                </label>
              </div>

              {resumeUrl && (
                <div className="p-4 rounded-2xl bg-muted/20 border border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-emerald-500" />
                    <div>
                      <div className="text-xs font-bold text-foreground">Active Resume Document</div>
                      <div className="text-[11px] text-muted-foreground">Attached to your candidate profile</div>
                    </div>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs h-8 border-border"
                  >
                    <a href={resumeUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> View Resume
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}
