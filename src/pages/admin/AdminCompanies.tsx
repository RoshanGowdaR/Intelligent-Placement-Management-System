import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Tables } from "@/integrations/supabase/types";

type Company = Tables<"companies">;

const defaultForm = {
  name: "", description: "", jobRole: "", salaryPackage: "", jobLocation: "",
  jobType: "Full-time", minCgpa: "", yearOfPassing: "", skillsCutoff: "",
  requiredSkills: "", maxBacklogs: "0", allowedBranches: "", bondDetails: "",
  selectionProcess: "", requirements: "",
};

export default function AdminCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState({ ...defaultForm });

  const fetchCompanies = async () => {
    const { data } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
    setCompanies(data ?? []);
  };

  useEffect(() => { fetchCompanies(); }, []);

  const resetForm = () => { setForm({ ...defaultForm }); setEditing(null); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Company name is required"); return; }
    const criteria = {
      min_cgpa: parseFloat(form.minCgpa) || 0,
      year_of_passing: parseInt(form.yearOfPassing) || 0,
      skills_cutoff: parseFloat(form.skillsCutoff) || 0,
    };
    const skillsList = form.requiredSkills.split(",").map(s => s.trim()).filter(Boolean);
    const branchesList = form.allowedBranches.split(",").map(s => s.trim()).filter(Boolean);
    const processList = form.selectionProcess.split(",").map(s => s.trim()).filter(Boolean);
    const requirementsList = form.requirements.split("\n").map(s => s.trim()).filter(Boolean);

    const payload = {
      name: form.name,
      description: form.description || null,
      job_role: form.jobRole || null,
      salary_package: form.salaryPackage || null,
      job_location: form.jobLocation || null,
      job_type: form.jobType,
      eligibility_criteria: criteria,
      skills_priority: skillsList,
      max_backlogs: parseInt(form.maxBacklogs) || 0,
      allowed_branches: branchesList,
      bond_details: form.bondDetails || null,
      selection_process: processList,
      requirements: requirementsList,
    };

    if (editing) {
      const { error } = await supabase.from("companies").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Company updated");
      supabase.functions.invoke("send-company-notification", {
        body: { companyName: form.name, action: "updated", eligibility: criteria },
      }).catch(() => {});
    } else {
      const { error } = await supabase.from("companies").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Company added");
      supabase.functions.invoke("send-company-notification", {
        body: { companyName: form.name, action: "added", eligibility: criteria },
      }).catch(() => {});
    }
    setOpen(false);
    resetForm();
    fetchCompanies();
  };

  const handleEdit = (c: Company) => {
    const criteria = (c.eligibility_criteria as Record<string, number>) ?? {};
    const skills = (c.skills_priority as string[]) ?? [];
    const branches = ((c as any).allowed_branches as string[]) ?? [];
    const process = ((c as any).selection_process as string[]) ?? [];
    const reqs = ((c as any).requirements as string[]) ?? [];
    setForm({
      name: c.name,
      description: (c as any).description ?? "",
      jobRole: (c as any).job_role ?? "",
      salaryPackage: (c as any).salary_package ?? "",
      jobLocation: (c as any).job_location ?? "",
      jobType: (c as any).job_type ?? "Full-time",
      minCgpa: String(criteria.min_cgpa ?? ""),
      yearOfPassing: String(criteria.year_of_passing ?? ""),
      skillsCutoff: String(criteria.skills_cutoff ?? ""),
      requiredSkills: skills.join(", "),
      maxBacklogs: String((c as any).max_backlogs ?? "0"),
      allowedBranches: branches.join(", "),
      bondDetails: (c as any).bond_details ?? "",
      selectionProcess: process.join(", "),
      requirements: reqs.join("\n"),
    });
    setEditing(c);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Company deleted");
    fetchCompanies();
  };

  const filtered = companies.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const f = (field: keyof typeof form, value: string) => setForm(p => ({ ...p, [field]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground">Manage placement companies and eligibility</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Company</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Company" : "Add Company"}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6 pt-2">
                {/* Basic Info */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-2">
                      <Label>Company Name *</Label>
                      <Input value={form.name} onChange={(e) => f("name", e.target.value)} />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Description</Label>
                      <Textarea value={form.description} onChange={(e) => f("description", e.target.value)} placeholder="Brief company overview…" rows={2} />
                    </div>
                  </div>
                </div>

                {/* Job Details */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Job Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Job Role</Label>
                      <Input value={form.jobRole} onChange={(e) => f("jobRole", e.target.value)} placeholder="e.g. Software Engineer" />
                    </div>
                    <div className="space-y-2">
                      <Label>Salary Package</Label>
                      <Input value={form.salaryPackage} onChange={(e) => f("salaryPackage", e.target.value)} placeholder="e.g. 8-12 LPA" />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input value={form.jobLocation} onChange={(e) => f("jobLocation", e.target.value)} placeholder="e.g. Bangalore, Remote" />
                    </div>
                    <div className="space-y-2">
                      <Label>Job Type</Label>
                      <Select value={form.jobType} onValueChange={(v) => f("jobType", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Full-time">Full-time</SelectItem>
                          <SelectItem value="Internship">Internship</SelectItem>
                          <SelectItem value="Internship + FTE">Internship + FTE</SelectItem>
                          <SelectItem value="Contract">Contract</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Bond Details</Label>
                      <Input value={form.bondDetails} onChange={(e) => f("bondDetails", e.target.value)} placeholder="e.g. 2 year service agreement" />
                    </div>
                  </div>
                </div>

                {/* Eligibility */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Eligibility Criteria</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Min CGPA</Label>
                      <Input type="number" step="0.1" value={form.minCgpa} onChange={(e) => f("minCgpa", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Year of Passing</Label>
                      <Input type="number" value={form.yearOfPassing} onChange={(e) => f("yearOfPassing", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Skills Cutoff %</Label>
                      <Input type="number" value={form.skillsCutoff} onChange={(e) => f("skillsCutoff", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Backlogs</Label>
                      <Input type="number" value={form.maxBacklogs} onChange={(e) => f("maxBacklogs", e.target.value)} />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Allowed Branches</Label>
                      <Input value={form.allowedBranches} onChange={(e) => f("allowedBranches", e.target.value)} placeholder="e.g. CSE, ISE, ECE (comma separated)" />
                    </div>
                  </div>
                </div>

                {/* Skills & Process */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Skills & Selection</h3>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Required Skills</Label>
                      <Input value={form.requiredSkills} onChange={(e) => f("requiredSkills", e.target.value)} placeholder="e.g. Java, Python, React (comma separated)" />
                    </div>
                    <div className="space-y-2">
                      <Label>Selection Process</Label>
                      <Input value={form.selectionProcess} onChange={(e) => f("selectionProcess", e.target.value)} placeholder="e.g. Online Test, Technical Interview, HR Round (comma separated)" />
                    </div>
                    <div className="space-y-2">
                      <Label>Additional Requirements</Label>
                      <Textarea value={form.requirements} onChange={(e) => f("requirements", e.target.value)} placeholder="One requirement per line" rows={3} />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSave} className="w-full">{editing ? "Update" : "Add Company"}</Button>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search companies…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Min CGPA</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const criteria = (c.eligibility_criteria as Record<string, number>) ?? {};
                const skills = (c.skills_priority as string[]) ?? [];
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{c.name}</p>
                        {(c as any).job_location && <p className="text-xs text-muted-foreground">{(c as any).job_location}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{(c as any).job_role || "—"}</TableCell>
                    <TableCell className="text-sm">{(c as any).salary_package || "—"}</TableCell>
                    <TableCell>{criteria.min_cgpa ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {skills.length > 0 ? skills.slice(0, 3).map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                        )) : "—"}
                        {skills.length > 3 && <Badge variant="outline" className="text-xs">+{skills.length - 3}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No companies found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
