const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { roundId, userId } = await req.json();
    if (!roundId) {
      return new Response(JSON.stringify({ error: "Missing roundId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch target round
    const { data: targetRound, error: roundErr } = await supabase
      .from("drive_rounds")
      .select("*, companies(*)")
      .eq("id", roundId)
      .single();

    if (roundErr || !targetRound) {
      return new Response(JSON.stringify({ error: "Round not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check prior round if round_number > 1
    if (targetRound.round_number > 1) {
      const { data: prevRound } = await supabase
        .from("drive_rounds")
        .select("is_published")
        .eq("company_id", targetRound.company_id)
        .eq("round_number", targetRound.round_number - 1)
        .single();

      if (!prevRound?.is_published) {
        return new Response(
          JSON.stringify({ error: `Round ${targetRound.round_number - 1} results must be published before opening Round ${targetRound.round_number}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    let studentIds: string[] = [];

    if (targetRound.round_number === 1) {
      const { data: profiles } = await supabase.from("profiles").select("id, cgpa, branch");
      const company = targetRound.companies as any;
      const criteria = (company?.eligibility_criteria as Record<string, any>) ?? {};
      const allowedBranches = (company?.allowed_branches as string[]) ?? [];

      studentIds = (profiles ?? [])
        .filter((p) => {
          const cgpaOk = !criteria.min_cgpa || (p.cgpa && p.cgpa >= criteria.min_cgpa);
          const branchOk = allowedBranches.length === 0 || (p.branch && allowedBranches.includes(p.branch));
          return cgpaOk && branchOk;
        })
        .map((p) => p.id);
    } else {
      const { data: prevRound } = await supabase
        .from("drive_rounds")
        .select("id")
        .eq("company_id", targetRound.company_id)
        .eq("round_number", targetRound.round_number - 1)
        .single();

      const { data: qualified } = await supabase
        .from("round_participants")
        .select("student_id")
        .eq("drive_round_id", prevRound?.id)
        .eq("status", "qualified");

      studentIds = (qualified ?? []).map((q) => q.student_id);
    }

    if (studentIds.length > 0) {
      const toInsert = studentIds.map((sid) => ({
        drive_round_id: roundId,
        student_id: sid,
        status: "pending",
      }));
      await supabase.from("round_participants").upsert(toInsert, { onConflict: "drive_round_id,student_id" });

      const notifs = studentIds.map((sid) => ({
        user_id: sid,
        title: `🎯 Round ${targetRound.round_number}: ${targetRound.round_name} is Open`,
        message: `You are enrolled in Round ${targetRound.round_number} (${targetRound.round_name}) with ${(targetRound.companies as any)?.name || "Visiting Company"}.`,
        type: "info",
        link: `/dashboard/companies/${targetRound.company_id}`,
      }));
      await supabase.from("notifications").insert(notifs);
    }

    return new Response(JSON.stringify({ success: true, count: studentIds.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
