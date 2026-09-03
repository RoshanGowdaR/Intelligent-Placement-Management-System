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
    const { roundId, evaluatorId, autoProgress } = await req.json();
    if (!roundId) {
      return new Response(JSON.stringify({ error: "Missing roundId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: round } = await supabase
      .from("drive_rounds")
      .select("*, companies(*)")
      .eq("id", roundId)
      .single();

    if (!round) {
      return new Response(JSON.stringify({ error: "Round not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: participants } = await supabase
      .from("round_participants")
      .select("*")
      .eq("drive_round_id", roundId);

    const pending = (participants ?? []).filter((p) => p.status === "pending");
    if (pending.length > 0) {
      return new Response(
        JSON.stringify({ error: `Cannot publish: ${pending.length} candidate(s) still pending evaluation.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();

    await supabase
      .from("drive_rounds")
      .update({ is_published: true, published_at: now, auto_progress: Boolean(autoProgress) })
      .eq("id", roundId);

    await supabase
      .from("round_participants")
      .update({ notified_at: now })
      .eq("drive_round_id", roundId);

    const notifs = (participants ?? []).map((p) => {
      const isQualified = p.status === "qualified";
      const emoji = isQualified ? "🎉" : "📋";
      const compName = (round.companies as any)?.name || "Company";
      return {
        user_id: p.student_id,
        title: `${emoji} Round ${round.round_number} Results Published: ${round.round_name}`,
        message: isQualified
          ? `Congratulations! You have qualified Round ${round.round_number} (${round.round_name}) with ${compName}. View your drive progress for next steps!`
          : `Results for Round ${round.round_number} (${round.round_name}) with ${compName} have been announced. Thank you for your participation.`,
        type: isQualified ? "test_result" : "info",
        link: `/dashboard/companies/${round.company_id}`,
      };
    });

    if (notifs.length > 0) {
      await supabase.from("notifications").insert(notifs);
    }

    return new Response(JSON.stringify({ success: true, count: participants?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
