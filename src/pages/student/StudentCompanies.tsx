import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Building2, CheckCircle2, XCircle, ArrowRight, Briefcase, MapPin, DollarSign } from "lucide-react";

export default function StudentCompanies() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [compRes, profRes] = await Promise.all([
        supabase.from("companies").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").eq("id", user.id).single(),
      ]);
      setCompanies(compRes.data ?? []);
      setProfile(profRes.data);
    };
    fetchData();
  }, [user]);

  const checkEligibility = (company: any) => {
    const criteria = (company.eligibility_criteria as Record<string, any>) ?? {};
    const allowedBranches = (company.allowed_branches as string[]) ?? [];
    const cgpaOk = !criteria.min_cgpa || (profile?.cgpa && profile.cgpa >= criteria.min_cgpa);
    const yearOk = !criteria.year_of_passing || (profile?.year_of_passing && profile.year_of_passing === criteria.year_of_passing);
    const branchOk = allowedBranches.length === 0 || (profile?.branch && allowedBranches.includes(profile.branch));
    return cgpaOk && yearOk && branchOk;
  };

  const filtered = companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
        <p className="text-muted-foreground">Browse placement companies and check your eligibility</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search companies…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(c => {
          const eligible = checkEligibility(c);
          const skills = (c.skills_priority as string[]) ?? [];
          return (
            <Link key={c.id} to={`/dashboard/companies/${c.id}`}>
              <Card className="h-full transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      {c.name}
                    </CardTitle>
                    <Badge variant={eligible ? "default" : "destructive"} className="text-xs shrink-0">
                      {eligible ? "Eligible" : "Not Eligible"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {c.job_role && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Briefcase className="h-3.5 w-3.5" /> {c.job_role}
                    </div>
                  )}
                  {c.salary_package && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" /> {c.salary_package}
                    </div>
                  )}
                  {c.job_location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {c.job_location}
                    </div>
                  )}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {skills.slice(0, 4).map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                      {skills.length > 4 && <Badge variant="outline" className="text-xs">+{skills.length - 4}</Badge>}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-primary">
                    View details <ArrowRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-8">No companies found</p>
        )}
      </div>
    </div>
  );
}
