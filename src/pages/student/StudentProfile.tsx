import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload, FileText, Loader2, CheckCircle2, Check,
  Sparkles, ExternalLink, Download, UserCheck, ShieldCheck,
  Eye, Copy, Plus, Trash2, ArrowRight, Github, Linkedin, Globe,
  Briefcase, GraduationCap, Award, Languages, Settings2
} from "lucide-react";

interface MarksCardEntry {
  semester: number;
  path: string;
  sgpa: number | null;
  verified: boolean;
  uploadedAt: string;
}

export default function StudentProfile() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("01");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: "",
    title: "",
    summary: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    linkedin: "",
    github: "",
    twitter: "",
    leetcode: "",
    hackerrank: "",
    skills: [] as string[],
    newSkill: "",
    experiences: [] as { role: string; company: string; duration: string; description: string }[],
    projects: [] as { title: string; link: string; stack: string; description: string }[],
    education: [] as { degree: string; institution: string; year: string; score: string }[],
    certifications: [] as { name: string; issuer: string; link: string }[],
    achievements: [] as string[],
    languages: [] as string[],
    usn: "",
    branch: "",
    yearOfPassing: "",
  });

  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [isLateralEntry, setIsLateralEntry] = useState<boolean | null>(null);
  const [currentSemester, setCurrentSemester] = useState<number | null>(null);
  const [marksCards, setMarksCards] = useState<MarksCardEntry[]>([]);
  const [cgpa, setCgpa] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (data) {
        const d = data as Record<string, any>;
        setForm(prev => ({
          ...prev,
          name: d.name ?? "",
          title: d.headline ?? "Full Stack Developer",
          summary: d.bio ?? "Passionate software engineer focused on building scalable, user-centric web applications.",
          email: user.email ?? "",
          phone: d.phone ?? "",
          location: d.location ?? "Bengaluru, Karnataka",
          website: d.portfolio_url ?? "",
          linkedin: d.linkedin_url ?? "",
          github: d.github_url ?? "",
          twitter: d.twitter_url ?? "",
          leetcode: d.leetcode_url ?? "",
          hackerrank: d.hackerrank_url ?? "",
          skills: (d.skills as string[]) ?? ["React", "TypeScript", "Node.js", "Python", "SQL"],
          experiences: (d.experience as any[]) ?? [],
          projects: (d.projects as any[]) ?? [],
          education: (d.education as any[]) ?? [
            { degree: "B.Tech in Computer Science", institution: "Engineering College", year: "2026", score: "8.5 CGPA" }
          ],
          certifications: (d.certifications as any[]) ?? [],
          achievements: (d.achievements as string[]) ?? [],
          languages: (d.languages as string[]) ?? ["English", "Kannada", "Hindi"],
          usn: d.usn ?? "",
          branch: d.branch ?? "",
          yearOfPassing: d.year_of_passing ? String(d.year_of_passing) : "",
        }));

        setResumeUrl(d.resume_url ?? null);
        setIsLateralEntry(d.is_lateral_entry ?? null);
        setCurrentSemester(d.current_semester ?? null);
        setMarksCards((d.marks_cards as MarksCardEntry[]) ?? []);

        const sgpas = (d.sgpas as Record<string, number>) ?? {};
        const sgpaValues = Object.values(sgpas);
        if (sgpaValues.length > 0) {
          setCgpa(parseFloat((sgpaValues.reduce((a, b) => a + b, 0) / sgpaValues.length).toFixed(2)));
        } else {
          setCgpa(d.cgpa ?? null);
        }
      }
    });
  }, [user]);

  // Readiness Calculation
  const calculateReadiness = () => {
    let score = 0;
    if (form.name.trim()) score += 10;
    if (form.title.trim()) score += 10;
    if (form.summary.trim()) score += 10;
    if (form.usn.trim()) score += 10;
    if (form.skills.length > 0) score += 15;
    if (form.projects.length > 0 || form.experiences.length > 0) score += 15;
    if (resumeUrl) score += 15;
    if (marksCards.length > 0) score += 15;
    return Math.min(score, 100);
  };

  const readinessPercentage = calculateReadiness();

  // Scrollspy via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const secId = entry.target.id.replace("section-", "");
            if (secId) setActiveSection(secId);
          }
        });
      },
      {
        root: null,
        rootMargin: "-20% 0px -50% 0px",
        threshold: 0.1,
      }
    );

    sections.forEach((sec) => {
      const el = document.getElementById(`section-${sec.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (secId: string) => {
    setActiveSection(secId);
    const el = document.getElementById(`section-${secId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        name: form.name,
        headline: form.title,
        bio: form.summary,
        phone: form.phone,
        location: form.location,
        portfolio_url: form.website,
        linkedin_url: form.linkedin,
        github_url: form.github,
        twitter_url: form.twitter,
        leetcode_url: form.leetcode,
        hackerrank_url: form.hackerrank,
        skills: form.skills,
        experience: form.experiences,
        projects: form.projects,
        education: form.education,
        certifications: form.certifications,
        achievements: form.achievements,
        languages: form.languages,
        usn: form.usn,
        branch: form.branch,
        year_of_passing: parseInt(form.yearOfPassing) || null,
        profile_completion_percentage: readinessPercentage,
      } as Record<string, any>).eq("id", user.id);

      if (error) throw error;
      toast.success("Profile saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = () => {
    if (!form.newSkill.trim()) return;
    if (!form.skills.includes(form.newSkill.trim())) {
      setForm(prev => ({
        ...prev,
        skills: [...prev.skills, prev.newSkill.trim()],
        newSkill: "",
      }));
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove),
    }));
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
    if (!file.name.endsWith(".pdf")) { toast.error("Only PDF files are accepted"); return; }

    setUploading(true);
    const fileName = `${form.usn.trim() || "CANDIDATE"}_${form.name.trim().replace(/\s+/g, "_")}.pdf`;
    const path = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage.from("resumes").upload(path, file, { upsert: true });
    if (uploadError) { toast.error("Upload failed: " + uploadError.message); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("resumes").getPublicUrl(path);
    setResumeUrl(publicUrl);

    await supabase.from("profiles").update({
      resume_url: publicUrl,
      profile_completion_percentage: readinessPercentage,
    }).eq("id", user.id);

    setUploading(false);
    toast.success("Resume imported successfully");
  };

  const userInitial = form.name ? form.name.charAt(0).toUpperCase() : (user?.email?.charAt(0).toUpperCase() || "A");

  // 10 Navigation Sections matching Reference Images
  const sections = [
    { id: "01", label: "Basics" },
    { id: "02", label: "Links & accounts" },
    { id: "03", label: "Skills" },
    { id: "04", label: "Experience" },
    { id: "05", label: "Projects" },
    { id: "06", label: "Education" },
    { id: "07", label: "Certifications" },
    { id: "08", label: "Achievements" },
    { id: "09", label: "Languages" },
    { id: "10", label: "Job preferences" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Studio Action Ribbon matching Image 1 */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Button size="sm" className="rounded-xl bg-[#0f0f1c] text-white text-xs font-bold gap-1.5 h-9 px-4 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 fill-white" /> Studio
          </Button>
          <Button size="sm" variant="ghost" className="rounded-xl text-muted-foreground text-xs font-semibold gap-1.5 h-9 px-3 hover:text-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-500" /> Verified Evidence
          </Button>
          <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/10 text-[10px] py-1 px-2.5 font-bold gap-1">
            <Sparkles className="h-3 w-3" /> AI Builder PRO
          </Badge>
          <Badge variant="outline" className="border-border text-muted-foreground text-[10px] py-1 px-2 font-semibold">
            JD Tailor PRO+
          </Badge>
          <Badge variant="outline" className="border-border text-muted-foreground text-[10px] py-1 px-2 font-semibold">
            Export PRO
          </Badge>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-[#5b51d8] hover:bg-[#4d43cc] text-white text-xs font-bold h-9 px-5 gap-1.5 shrink-0 shadow-md"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
          Save Changes
        </Button>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Sticky Navigation & Progress (4 Cols) */}
        <div className="lg:col-span-4 lg:sticky lg:top-4 self-start space-y-6">
          <div className="p-6 rounded-3xl bg-card border border-border/60 shadow-sm space-y-6">
            
            {/* Readiness Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="uppercase text-[10px] tracking-wider text-muted-foreground">Profile Readiness</span>
                <span className="font-display text-sm text-foreground">{readinessPercentage}%</span>
              </div>
              <Progress value={readinessPercentage} className="h-1.5 bg-muted [&>div]:bg-[#5b51d8]" />
            </div>

            {/* Step Selector List */}
            <div className="space-y-1">
              {sections.map((sec) => {
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                      isActive
                        ? "bg-[#0f0f1c] text-white font-bold shadow-sm"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <span className={`font-mono text-[11px] ${isActive ? "text-[#8e85ff]" : "text-muted-foreground"}`}>
                      {sec.id}
                    </span>
                    <span>{sec.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Import & Public Profile Actions */}
            <div className="pt-4 border-t border-border/60 space-y-2.5">
              <label className="w-full block cursor-pointer">
                <input
                  type="file"
                  accept=".pdf"
                  disabled={uploading}
                  onChange={handleResumeUpload}
                  className="hidden"
                />
                <Button
                  asChild
                  type="button"
                  className="w-full h-10 rounded-xl bg-[#5b51d8] hover:bg-[#4d43cc] text-white text-xs font-bold gap-2 shadow-sm"
                >
                  <span>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Import from résumé
                  </span>
                </Button>
              </label>

              {resumeUrl && (
                <Button
                  asChild
                  variant="outline"
                  className="w-full h-9 rounded-xl border-border text-xs font-semibold gap-2"
                >
                  <a href={resumeUrl} target="_blank" rel="noreferrer">
                    <Eye className="h-3.5 w-3.5" /> View active résumé
                  </a>
                </Button>
              )}
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Continuous Scrolling Form Workspace (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Blue Check Verification Banner matching Image 1 */}
          <div className="p-6 rounded-3xl bg-[#0e172a] text-white border border-blue-900/40 shadow-sm relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400">Verified Candidate</div>
                  <h3 className="font-display text-lg font-bold text-white mt-0.5">Earn your blue check</h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Verified profiles rank higher in company placement shortlists and recruiters trust them more.
                  </p>
                </div>
              </div>

              <Button size="sm" className="rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold shrink-0 gap-1.5 h-9 px-4">
                View evidence <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Check Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-5 border-t border-white/10 mt-5">
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px] gap-1 py-1 px-2.5">
                <Check className="h-3 w-3" /> Identity
              </Badge>
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px] gap-1 py-1 px-2.5">
                <Check className="h-3 w-3" /> Email verified
              </Badge>
              <Badge variant="outline" className="text-slate-400 border-white/10 text-[10px] py-1 px-2.5">
                Skills verified
              </Badge>
              <Badge variant="outline" className="text-slate-400 border-white/10 text-[10px] py-1 px-2.5">
                Project reviewed
              </Badge>
              <Badge variant="outline" className="text-slate-400 border-white/10 text-[10px] py-1 px-2.5">
                Assessment passed
              </Badge>
            </div>
          </div>

          {/* SECTION 01: BASICS */}
          <div id="section-01" className="scroll-mt-24 p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#5b51d8]">
                <span>01</span>
                <span>Basics</span>
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mt-1">Identity &amp; Profile Summary</h3>
              <p className="text-xs text-muted-foreground">Identity, headline, and summary — the first thing a recruiter reads.</p>
            </div>

            {/* Photo Area */}
            <div className="flex items-center gap-4 pt-2">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-[#5b51d8] to-[#8075ff] text-white font-display font-extrabold text-2xl flex items-center justify-center shadow-md shrink-0">
                {userInitial}
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">Profile photo</h4>
                <p className="text-[11px] text-muted-foreground">A clear headshot. Used on your public profile.</p>
                <label className="cursor-pointer inline-block mt-2">
                  <input type="file" accept="image/*" className="hidden" />
                  <Button type="button" size="sm" variant="outline" asChild className="h-7 text-[11px] rounded-lg border-border">
                    <span><Upload className="h-3 w-3 mr-1" /> Upload photo</span>
                  </Button>
                </label>
              </div>
            </div>

            {/* Input Fields */}
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Full Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="h-10 rounded-xl bg-muted/30 border-border"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">University Seat Number (USN) *</Label>
                  <Input
                    value={form.usn}
                    onChange={(e) => setForm({ ...form, usn: e.target.value })}
                    placeholder="e.g. 1RV21CS001"
                    className="h-10 rounded-xl bg-muted/30 border-border uppercase font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Engineering Branch</Label>
                  <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v })}>
                    <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-border text-xs">
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
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Professional Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Full Stack Developer"
                  className="h-10 rounded-xl bg-muted/30 border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Professional Summary</Label>
                <Textarea
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  placeholder="2–3 lines on what you build and what you're looking for."
                  className="rounded-xl bg-muted/30 border-border min-h-[90px] text-xs"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Email</Label>
                  <Input
                    disabled
                    value={form.email}
                    className="h-10 rounded-xl bg-muted/50 border-border text-muted-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="h-10 rounded-xl bg-muted/30 border-border"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Bengaluru, Karnataka"
                  className="h-10 rounded-xl bg-muted/30 border-border"
                />
              </div>
            </div>
          </div>

          {/* SECTION 02: LINKS & ACCOUNTS */}
          <div id="section-02" className="scroll-mt-24 p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#5b51d8]">
                <span>02</span>
                <span>Links &amp; accounts</span>
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mt-1">Social &amp; Coding Portfolios</h3>
              <p className="text-xs text-muted-foreground">Where recruiters find you. Connected accounts also feed live data into your profile.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Website / Portfolio</Label>
                <Input
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://"
                  className="h-10 rounded-xl bg-muted/30 border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">LinkedIn</Label>
                <Input
                  value={form.linkedin}
                  onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                  placeholder="linkedin.com/in/"
                  className="h-10 rounded-xl bg-muted/30 border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">GitHub</Label>
                <Input
                  value={form.github}
                  onChange={(e) => setForm({ ...form, github: e.target.value })}
                  placeholder="github.com/"
                  className="h-10 rounded-xl bg-muted/30 border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Twitter / X</Label>
                <Input
                  value={form.twitter}
                  onChange={(e) => setForm({ ...form, twitter: e.target.value })}
                  placeholder="x.com/"
                  className="h-10 rounded-xl bg-muted/30 border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">LeetCode</Label>
                <Input
                  value={form.leetcode}
                  onChange={(e) => setForm({ ...form, leetcode: e.target.value })}
                  placeholder="leetcode.com/"
                  className="h-10 rounded-xl bg-muted/30 border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">HackerRank</Label>
                <Input
                  value={form.hackerrank}
                  onChange={(e) => setForm({ ...form, hackerrank: e.target.value })}
                  placeholder="hackerrank.com/"
                  className="h-10 rounded-xl bg-muted/30 border-border"
                />
              </div>
            </div>
          </div>

          {/* SECTION 03: SKILLS */}
          <div id="section-03" className="scroll-mt-24 p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#5b51d8]">
                <span>03</span>
                <span>Skills</span>
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mt-1">Technical Skills</h3>
              <p className="text-xs text-muted-foreground">Green skills are verified by assessments — recruiters trust those most.</p>
            </div>

            <div className="flex gap-2">
              <Input
                value={form.newSkill}
                onChange={(e) => setForm({ ...form, newSkill: e.target.value })}
                placeholder="Type a skill (e.g. Docker, Next.js, GraphQL)"
                className="h-10 rounded-xl bg-muted/30 border-border"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSkill(); } }}
              />
              <Button onClick={handleAddSkill} className="rounded-xl bg-[#5b51d8] text-white text-xs font-bold px-4 h-10">
                <Plus className="h-4 w-4 mr-1" /> Add skill
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {form.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-xs font-semibold"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{skill}</span>
                  <button onClick={() => handleRemoveSkill(skill)} className="hover:text-rose-500 text-muted-foreground ml-1">
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* SECTION 04: EXPERIENCE */}
          <div id="section-04" className="scroll-mt-24 p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#5b51d8]">
                <span>04</span>
                <span>Experience</span>
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mt-1">Work &amp; Internships</h3>
              <p className="text-xs text-muted-foreground">Roles, companies and impact. Use action verbs and numbers where you can.</p>
            </div>

            <Button
              onClick={() => setForm(prev => ({
                ...prev,
                experiences: [...prev.experiences, { role: "Software Intern", company: "Company Name", duration: "Jun 2025 - Aug 2025", description: "Built key features..." }]
              }))}
              variant="outline"
              className="w-full h-11 rounded-2xl border-dashed border-border/80 text-xs font-bold gap-2 text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" /> Add a role
            </Button>

            {form.experiences.map((exp, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-3">
                <div className="flex items-center justify-between">
                  <Input
                    value={exp.role}
                    onChange={(e) => {
                      const updated = [...form.experiences];
                      updated[idx].role = e.target.value;
                      setForm({ ...form, experiences: updated });
                    }}
                    className="h-8 font-bold text-xs bg-card border-border max-w-[200px]"
                  />
                  <button
                    onClick={() => setForm({ ...form, experiences: form.experiences.filter((_, i) => i !== idx) })}
                    className="text-muted-foreground hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <Input
                  placeholder="Company name & duration"
                  value={exp.company}
                  onChange={(e) => {
                    const updated = [...form.experiences];
                    updated[idx].company = e.target.value;
                    setForm({ ...form, experiences: updated });
                  }}
                  className="h-8 text-xs bg-card border-border"
                />
                <Textarea
                  placeholder="Describe impact, tech stack, and achievements..."
                  value={exp.description}
                  onChange={(e) => {
                    const updated = [...form.experiences];
                    updated[idx].description = e.target.value;
                    setForm({ ...form, experiences: updated });
                  }}
                  className="text-xs bg-card border-border min-h-[60px]"
                />
              </div>
            ))}
          </div>

          {/* SECTION 05: PROJECTS */}
          <div id="section-05" className="scroll-mt-24 p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#5b51d8]">
                <span>05</span>
                <span>Projects</span>
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mt-1">Featured Projects</h3>
              <p className="text-xs text-muted-foreground">Your strongest builds with live links and stack. Mentor-reviewed ones carry the most weight.</p>
            </div>

            <Button
              onClick={() => setForm(prev => ({
                ...prev,
                projects: [...prev.projects, { title: "New Project", link: "https://github.com/", stack: "React, Node.js", description: "Built scalable web service..." }]
              }))}
              variant="outline"
              className="w-full h-11 rounded-2xl border-dashed border-border/80 text-xs font-bold gap-2 text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" /> Add a project
            </Button>

            {form.projects.map((proj, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-3">
                <div className="flex items-center justify-between">
                  <Input
                    value={proj.title}
                    onChange={(e) => {
                      const updated = [...form.projects];
                      updated[idx].title = e.target.value;
                      setForm({ ...form, projects: updated });
                    }}
                    className="h-8 font-bold text-xs bg-card border-border max-w-[200px]"
                  />
                  <button
                    onClick={() => setForm({ ...form, projects: form.projects.filter((_, i) => i !== idx) })}
                    className="text-muted-foreground hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <Input
                  placeholder="Project link or GitHub URL"
                  value={proj.link}
                  onChange={(e) => {
                    const updated = [...form.projects];
                    updated[idx].link = e.target.value;
                    setForm({ ...form, projects: updated });
                  }}
                  className="h-8 text-xs bg-card border-border"
                />
                <Textarea
                  placeholder="Overview of features, architecture, and libraries..."
                  value={proj.description}
                  onChange={(e) => {
                    const updated = [...form.projects];
                    updated[idx].description = e.target.value;
                    setForm({ ...form, projects: updated });
                  }}
                  className="text-xs bg-card border-border min-h-[60px]"
                />
              </div>
            ))}
          </div>

          {/* SECTION 06: EDUCATION */}
          <div id="section-06" className="scroll-mt-24 p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#5b51d8]">
                <span>06</span>
                <span>Education</span>
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mt-1">Academic Credentials</h3>
              <p className="text-xs text-muted-foreground">Degrees, institutions, and grades verified by college placement office.</p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-foreground">Bachelor of Engineering (B.E / B.Tech)</div>
                {cgpa !== null && (
                  <Badge className="bg-[#5b51d8]/15 text-[#5b51d8] border-[#5b51d8]/30 font-mono text-xs">
                    CGPA: {cgpa}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Branch: <span className="font-semibold text-foreground">{form.branch || "Computer Science"}</span> • Graduating Class of <span className="font-semibold text-foreground">{form.yearOfPassing || "2026"}</span>
              </div>
            </div>
          </div>

          {/* SECTION 07: CERTIFICATIONS */}
          <div id="section-07" className="scroll-mt-24 p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#5b51d8]">
                <span>07</span>
                <span>Certifications</span>
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mt-1">Credentials &amp; Badges</h3>
              <p className="text-xs text-muted-foreground">Courses and credentials, with verification links where you have them.</p>
            </div>

            <Button
              onClick={() => setForm(prev => ({
                ...prev,
                certifications: [...prev.certifications, { name: "AWS Certified Cloud Practitioner", issuer: "Amazon Web Services", link: "https://" }]
              }))}
              variant="outline"
              className="w-full h-11 rounded-2xl border-dashed border-border/80 text-xs font-bold gap-2 text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" /> Add a certificate
            </Button>

            {form.certifications.map((cert, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-muted/20 border border-border/60 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-xs text-foreground">{cert.name}</div>
                  <div className="text-[11px] text-muted-foreground">{cert.issuer}</div>
                </div>
                <button
                  onClick={() => setForm({ ...form, certifications: form.certifications.filter((_, i) => i !== idx) })}
                  className="text-muted-foreground hover:text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* SECTION 08: ACHIEVEMENTS */}
          <div id="section-08" className="scroll-mt-24 p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#5b51d8]">
                <span>08</span>
                <span>Achievements &amp; awards</span>
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mt-1">Honors &amp; Recognitions</h3>
              <p className="text-xs text-muted-foreground">Hackathon wins, recognitions, open-source contributions — anything that sets you apart.</p>
            </div>

            <Button
              onClick={() => setForm(prev => ({
                ...prev,
                achievements: [...prev.achievements, "Finalist in Smart India Hackathon 2025"]
              }))}
              variant="outline"
              className="w-full h-11 rounded-2xl border-dashed border-border/80 text-xs font-bold gap-2 text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" /> Add an achievement
            </Button>

            {form.achievements.map((ach, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 flex items-center justify-between text-xs font-medium">
                <span>{ach}</span>
                <button
                  onClick={() => setForm({ ...form, achievements: form.achievements.filter((_, i) => i !== idx) })}
                  className="text-muted-foreground hover:text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* SECTION 09: LANGUAGES */}
          <div id="section-09" className="scroll-mt-24 p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#5b51d8]">
                <span>09</span>
                <span>Languages</span>
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mt-1">Languages</h3>
              <p className="text-xs text-muted-foreground">Spoken languages and proficiency.</p>
            </div>

            <Button
              onClick={() => {
                const lang = prompt("Enter language (e.g. English, German, French):");
                if (lang && !form.languages.includes(lang.trim())) {
                  setForm({ ...form, languages: [...form.languages, lang.trim()] });
                }
              }}
              variant="outline"
              className="w-full h-11 rounded-2xl border-dashed border-border/80 text-xs font-bold gap-2 text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" /> Add a language
            </Button>

            <div className="flex flex-wrap gap-2 pt-2">
              {form.languages.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-muted/60 text-foreground border border-border text-xs font-semibold"
                >
                  <span>{lang}</span>
                  <button
                    onClick={() => setForm({ ...form, languages: form.languages.filter(l => l !== lang) })}
                    className="hover:text-rose-500 text-muted-foreground ml-1 text-sm font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* SECTION 10: JOB PREFERENCES */}
          <div id="section-10" className="scroll-mt-24 p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#5b51d8]">
                <span>10</span>
                <span>Job preferences</span>
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mt-1">Job preferences</h3>
              <p className="text-xs text-muted-foreground">What you're open to — recruiters use this to match and filter.</p>
            </div>

            <div className="space-y-4">
              {/* OPEN TO ROLES */}
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Open to Roles</Label>
                <Input
                  placeholder="Full-Stack Developer, Backend Engineer..."
                  defaultValue="Full-Stack Developer, Backend Engineer, SDE-1"
                  className="h-10 rounded-xl bg-muted/30 border-border"
                />
              </div>

              {/* WORK MODE & EMPLOYMENT TYPE */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Work Mode</Label>
                  <Select defaultValue="hybrid">
                    <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-border text-xs">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_office">In-office</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="remote">Remote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Employment Type</Label>
                  <Select defaultValue="full_time">
                    <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-border text-xs">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full-time</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* PREFERRED LOCATIONS & NOTICE PERIOD */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Preferred Locations</Label>
                  <Input
                    placeholder="Bengaluru, Remote"
                    defaultValue="Bengaluru, Remote"
                    className="h-10 rounded-xl bg-muted/30 border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Notice Period</Label>
                  <Select defaultValue="immediate">
                    <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-border text-xs">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="15_days">15 Days</SelectItem>
                      <SelectItem value="1_month">1 Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* EXPECTED CTC */}
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Expected CTC</Label>
                <Input
                  placeholder="e.g. ₹6–8 LPA"
                  defaultValue="₹8–12 LPA"
                  className="h-10 rounded-xl bg-muted/30 border-border"
                />
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
