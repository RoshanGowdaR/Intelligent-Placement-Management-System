import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import {
  ArrowLeft, Building2, GraduationCap, CalendarDays, MapPin,
  Briefcase, DollarSign, CheckCircle2, XCircle, Clock, Users, FileText, Link2
} from "lucide-react";

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    const fetchData = async () => {
      const [compRes, profRes, testRes] = await Promise.all([
        supabase.from("companies").select("*").eq("id", id).single(),
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("tests").select("*").eq("company_id", id).order("scheduled_date", { ascending: true }),
      ]);
      setCompany(compRes.data);
      setProfile(profRes.data);
      setTests(testRes.data ?? []);
      setLoading(false);
    };
    fetchData();
  }, [id, user]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="space-y-4">
        <Link to="/dashboard/companies" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to companies
        </Link>
        <p className="text-muted-foreground">Company not found.</p>
      </div>
    );
  }

  const criteria = (company.eligibility_criteria as Record<string, any>) ?? {};
  const skills = (company.skills_priority as string[]) ?? [];
  const requirements = (company.requirements as string[]) ?? [];
  const allowedBranches = (company.allowed_branches as string[]) ?? [];
  const selectionProcess = (company.selection_process as string[]) ?? [];

  // Eligibility check
  const cgpaOk = !criteria.min_cgpa || (profile?.cgpa && profile.cgpa >= criteria.min_cgpa);
  const yearOk = !criteria.year_of_passing || (profile?.year_of_passing && profile.year_of_passing === criteria.year_of_passing);
  const branchOk = allowedBranches.length === 0 || (profile?.branch && allowedBranches.includes(profile.branch));
  const studentSkills = (profile?.skills as string[]) ?? [];
  const matchedSkills = skills.filter(s => studentSkills.some(ps => ps.toLowerCase() === s.toLowerCase()));
  const missingSkills = skills.filter(s => !studentSkills.some(ps => ps.toLowerCase() === s.toLowerCase()));
  const isEligible = cgpaOk && yearOk && branchOk;

  return (
    <div className="space-y-6">
      <Link to="/dashboard/companies" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to companies
      </Link>

      {/* Company Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            {company.name}
          </h1>
          {company.description && (
            <p className="mt-2 max-w-2xl text-muted-foreground">{company.description}</p>
          )}
        </div>
        <Badge variant={isEligible ? "default" : "destructive"} className="text-sm px-3 py-1">
          {isEligible ? <><CheckCircle2 className="mr-1 h-4 w-4" /> Eligible</> : <><XCircle className="mr-1 h-4 w-4" /> Not Eligible</>}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Job Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {company.job_role && (
              <div className="flex items-center gap-3">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <div><p className="text-xs text-muted-foreground">Role</p><p className="font-medium">{company.job_role}</p></div>
              </div>
            )}
            {company.salary_package && (
              <div className="flex items-center gap-3">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div><p className="text-xs text-muted-foreground">Package</p><p className="font-medium">{company.salary_package}</p></div>
              </div>
            )}
            {company.job_location && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div><p className="text-xs text-muted-foreground">Location</p><p className="font-medium">{company.job_location}</p></div>
              </div>
            )}
            {company.job_type && (
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div><p className="text-xs text-muted-foreground">Type</p><p className="font-medium">{company.job_type}</p></div>
              </div>
            )}
            {company.bond_details && (
              <div className="flex items-center gap-3">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <div><p className="text-xs text-muted-foreground">Bond</p><p className="font-medium">{company.bond_details}</p></div>
              </div>
            )}
            {!company.job_role && !company.salary_package && !company.job_location && (
              <p className="text-sm text-muted-foreground">No job details available yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Eligibility Criteria */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Eligibility Criteria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Minimum CGPA</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{criteria.min_cgpa || "N/A"}</span>
                {criteria.min_cgpa && (cgpaOk ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-destructive" />)}
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Year of Passing</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{criteria.year_of_passing || "Any"}</span>
                {criteria.year_of_passing && (yearOk ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-destructive" />)}
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Max Backlogs</span>
              <span className="font-medium">{company.max_backlogs ?? "N/A"}</span>
            </div>
            {allowedBranches.length > 0 && (
              <>
                <Separator />
                <div>
                  <span className="text-sm text-muted-foreground">Allowed Branches</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {allowedBranches.map((b, i) => (
                      <Badge key={i} variant={profile?.branch === b ? "default" : "secondary"} className="text-xs">{b}</Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
            {criteria.skills_cutoff > 0 && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Skills Cutoff</span>
                  <span className="font-medium">{criteria.skills_cutoff}%</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Required Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Required Skills</CardTitle>
            <CardDescription>
              {matchedSkills.length}/{skills.length} skills matched
            </CardDescription>
          </CardHeader>
          <CardContent>
            {skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No specific skills listed.</p>
            ) : (
              <div className="space-y-2">
                {skills.map((s, i) => {
                  const matched = matchedSkills.includes(s);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      {matched ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                      <span className={matched ? "font-medium" : "text-muted-foreground"}>{s}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selection Process */}
        {selectionProcess.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Selection Process</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {selectionProcess.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">{i + 1}</span>
                    <span className="text-sm">{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        {/* Additional Requirements */}
        {requirements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {requirements.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-primary">•</span> {r}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upcoming Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5" /> Tests for {company.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tests scheduled for this company yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {tests.map(t => (
                <div key={t.id} className="rounded-lg border p-4 space-y-2">
                  <p className="font-medium">{t.title}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {format(new Date(t.scheduled_date), "MMM d, yyyy h:mm a")}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {t.duration} minutes
                  </div>
                  {t.max_participants && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      Max {t.max_participants} participants
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
