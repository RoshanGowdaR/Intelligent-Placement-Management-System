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
import { toast } from "sonner";
import { Upload, FileText, Loader2, AlertTriangle, CheckCircle2, GraduationCap } from "lucide-react";

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
  const [form, setForm] = useState({ name: "", yearOfPassing: "", usn: "", branch: "", skills: "" });
  const [completion, setCompletion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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
    } as Record<string, unknown>).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setCompletion(newCompletion);
    setCgpa(calculatedCgpa);
    setNameAndUsnSaved(true);
    toast.success("Profile updated");
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!nameAndUsnSaved) { toast.error("Please save your Full Name and USN first before uploading"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
    if (!file.name.endsWith(".pdf")) { toast.error("Only PDF files are accepted"); return; }

    setUploading(true);
    const path = `${user.id}/resume.pdf`;
    const { error: uploadError } = await supabase.storage.from("resumes").upload(path, file, { upsert: true });
    if (uploadError) { toast.error(uploadError.message); setUploading(false); return; }
    const { error: updateError } = await supabase.from("profiles").update({ resume_url: path }).eq("id", user.id);
    if (updateError) { toast.error(updateError.message); setUploading(false); return; }
    setResumeUrl(path);
    setUploading(false);
    toast.success("Resume uploaded successfully");
  };

  const handleMarksCardUpload = async (semester: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!nameAndUsnSaved) { toast.error("Please save your Full Name and USN first before uploading marks cards"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }

    setUploadingSem(semester);

    try {
      // Convert file to base64 for AI verification
      const arrayBuffer = await file.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);
      const mimeType = file.type || "application/pdf";

      // Verify marks card with AI
      const { data: verification, error: verifyError } = await supabase.functions.invoke("verify-markscard", {
        body: {
          documentBase64: base64,
          mimeType,
          expectedName: form.name.trim(),
          expectedUsn: form.usn.trim(),
          semester,
        },
      });

      if (verifyError) throw verifyError;

      if (!verification.is_valid) {
        toast.error("Failed to upload marks details due to incorrect data matching. The name or USN on the marks card does not match your profile.", { duration: 6000 });
        setUploadingSem(null);
        e.target.value = "";
        return;
      }

      // Upload file to storage
      const ext = file.name.substring(file.name.lastIndexOf("."));
      const path = `${user.id}/sem-${semester}${ext}`;
      const { error: uploadError } = await supabase.storage.from("markscards").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      // Update marks cards list
      const newEntry: MarksCardEntry = {
        semester,
        path,
        sgpa: verification.extracted_sgpa ?? null,
        verified: true,
        uploadedAt: new Date().toISOString(),
      };

      const updatedCards = [...marksCards.filter(mc => mc.semester !== semester), newEntry].sort((a, b) => a.semester - b.semester);
      setMarksCards(updatedCards);

      // Recalculate CGPA
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">Update your details, upload marks cards and resume</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Profile Completion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={completion} className="h-3" />
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{completion}% complete</p>
            {cgpa !== null && (
              <Badge variant="secondary" className="text-sm">CGPA: {cgpa}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Personal Information - Must be filled first */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter your full name" />
            <p className="text-xs text-muted-foreground">⚠️ Please enter the name exactly as it appears on your marks card</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>USN (University Serial Number)</Label>
              <Input value={form.usn} onChange={(e) => setForm({ ...form, usn: e.target.value })} placeholder="e.g. 1BM21CS001" />
              <p className="text-xs text-muted-foreground">⚠️ Please enter the USN exactly as it appears on your marks card</p>
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} placeholder="e.g. Computer Science" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Year of Passing</Label>
            <Input type="number" value={form.yearOfPassing} onChange={(e) => setForm({ ...form, yearOfPassing: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Skills</Label>
            <Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="e.g. Java, Python, React, SQL (comma separated)" />
            <p className="text-xs text-muted-foreground">Add your technical skills to check company eligibility</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      {/* Marks Card Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Marks Cards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!nameAndUsnSaved && (
            <div className="flex items-center gap-2 rounded-lg border border-warning/50 bg-warning/5 p-3">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <p className="text-sm">Please save your Full Name and USN first before uploading marks cards.</p>
            </div>
          )}

          {/* Lateral Entry Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Are you a lateral entry student?</Label>
            <RadioGroup
              value={isLateralEntry === null ? "" : isLateralEntry ? "yes" : "no"}
              onValueChange={(v) => {
                setIsLateralEntry(v === "yes");
                setCurrentSemester(null);
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="lateral-yes" />
                <Label htmlFor="lateral-yes">Yes, Lateral Entry</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="lateral-no" />
                <Label htmlFor="lateral-no">No, Regular Entry</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Semester Selection */}
          {isLateralEntry !== null && (
            <div className="space-y-2">
              <Label>Current Semester</Label>
              <Select
                value={currentSemester ? String(currentSemester) : ""}
                onValueChange={(v) => setCurrentSemester(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your current semester" />
                </SelectTrigger>
                <SelectContent>
                  {(isLateralEntry ? [3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5, 6, 7, 8]).map((sem) => (
                    <SelectItem key={sem} value={String(sem)}>{sem}{sem === 1 ? "st" : sem === 2 ? "nd" : sem === 3 ? "rd" : "th"} Semester</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isLateralEntry && (
                <p className="text-xs text-muted-foreground">As a lateral entry student, you'll need to upload marks cards from 3rd semester onwards.</p>
              )}
            </div>
          )}

          {/* Upload slots for each required semester */}
          {requiredSemesters.length > 0 && (
            <div className="space-y-3 mt-4">
              <h4 className="text-sm font-medium text-muted-foreground">Upload marks cards for each semester:</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {requiredSemesters.map((sem) => {
                  const existing = marksCards.find(mc => mc.semester === sem);
                  const isUploading = uploadingSem === sem;

                  return (
                    <div key={sem} className={`rounded-lg border p-4 ${existing?.verified ? 'border-success/50 bg-success/5' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Semester {sem}</span>
                        {existing?.verified && (
                          <Badge variant="outline" className="text-success border-success/50 text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                          </Badge>
                        )}
                      </div>
                      {existing ? (
                        <div className="space-y-2">
                          {existing.sgpa !== null && (
                            <p className="text-sm text-muted-foreground">SGPA: <span className="font-medium text-foreground">{existing.sgpa}</span></p>
                          )}
                          <label className="cursor-pointer">
                            <Button variant="outline" size="sm" asChild disabled={isUploading || !nameAndUsnSaved}>
                              <span>{isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Replace"}</span>
                            </Button>
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => handleMarksCardUpload(sem, e)} disabled={isUploading || !nameAndUsnSaved} />
                          </label>
                        </div>
                      ) : (
                        <label className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed p-4 text-center hover:border-primary/50 transition-colors ${!nameAndUsnSaved ? 'opacity-50 pointer-events-none' : ''}`}>
                          {isUploading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          ) : (
                            <Upload className="h-5 w-5 text-muted-foreground" />
                          )}
                          <p className="text-xs">{isUploading ? "Verifying…" : "Upload"}</p>
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => handleMarksCardUpload(sem, e)} disabled={isUploading || !nameAndUsnSaved} />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
              {cgpa !== null && (
                <div className="rounded-lg border bg-card p-4 text-center">
                  <p className="text-sm text-muted-foreground">Calculated CGPA (from SGPAs)</p>
                  <p className="text-3xl font-bold text-primary">{cgpa}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resume Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Resume</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!nameAndUsnSaved && (
            <div className="flex items-center gap-2 rounded-lg border border-warning/50 bg-warning/5 p-3">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <p className="text-sm">Please save your Full Name and USN first before uploading your resume.</p>
            </div>
          )}
          {resumeUrl ? (
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <FileText className="h-8 w-8 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Resume uploaded</p>
                <button onClick={async () => {
                  const { data } = await supabase.storage.from("resumes").createSignedUrl(resumeUrl, 300);
                  if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                }} className="text-xs text-primary hover:underline">View resume</button>
              </div>
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild disabled={!nameAndUsnSaved}>
                  <span>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Replace"}</span>
                </Button>
                <input type="file" accept=".pdf" className="hidden" onChange={handleResumeUpload} disabled={uploading || !nameAndUsnSaved} />
              </label>
            </div>
          ) : (
            <label className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center hover:border-primary/50 transition-colors ${!nameAndUsnSaved ? 'opacity-50 pointer-events-none' : ''}`}>
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
              <p className="text-sm font-medium">{uploading ? "Uploading…" : "Click to upload your resume"}</p>
              <p className="text-xs text-muted-foreground">PDF only, max 5MB</p>
              <input type="file" accept=".pdf" className="hidden" onChange={handleResumeUpload} disabled={uploading || !nameAndUsnSaved} />
            </label>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
