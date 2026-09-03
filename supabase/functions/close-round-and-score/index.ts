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
    const { roundId } = await req.json();
    if (!roundId) {
      return new Response(JSON.stringify({ error: "Missing roundId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: round, error: roundErr } = await supabase
      .from("drive_rounds")
      .select("*")
      .eq("id", roundId)
      .single();

    if (roundErr || !round) {
      return new Response(JSON.stringify({ error: "Round not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: participants } = await supabase
      .from("round_participants")
      .select("*")
      .eq("drive_round_id", roundId);

    if (!participants || participants.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (round.round_type === "test" && round.test_id) {
      const studentIds = participants.map((p) => p.student_id);
      const { data: attempts } = await supabase
        .from("test_attempts")
        .select("student_id, total_score")
        .eq("test_id", round.test_id)
        .in("student_id", studentIds);

      const scoreMap: Record<string, number> = {};
      (attempts ?? []).forEach((a) => {
        scoreMap[a.student_id] = Math.max(scoreMap[a.student_id] ?? 0, a.total_score);
      });

      const attempters: { studentId: string; score: number }[] = [];
      const absents: string[] = [];

      participants.forEach((p) => {
        if (scoreMap[p.student_id] !== undefined) {
          attempters.push({ studentId: p.student_id, score: scoreMap[p.student_id] });
        } else {
          absents.push(p.student_id);
        }
      });

      // Sort attempters descending
      attempters.sort((a, b) => b.score - a.score);
      const total = attempters.length;
      let qualifiedIds = new Set<string>();

      if (round.passing_logic === "cutoff_score") {
        const cutoff = round.passing_value ?? 0;
        attempters.forEach((a) => {
          if (a.score >= cutoff) qualifiedIds.add(a.studentId);
        });
      } else if (round.passing_logic === "top_n") {
        const topN = Math.max(0, Math.floor(round.passing_value ?? 0));
        attempters.slice(0, topN).forEach((a) => qualifiedIds.add(a.studentId));
      } else if (round.passing_logic === "top_percent") {
        const pct = Math.min(100, Math.max(0, round.passing_value ?? 0));
        const count = Math.ceil((pct / 100) * total);
        attempters.slice(0, count).forEach((a) => qualifiedIds.add(a.studentId));
      }

      for (const a of attempters) {
        await supabase
          .from("round_participants")
          .update({
            score: a.score,
            status: qualifiedIds.has(a.studentId) ? "qualified" : "not_qualified",
            evaluated_at: new Date().toISOString(),
          })
          .eq("drive_round_id", roundId)
          .eq("student_id", a.studentId);
      }

      if (absents.length > 0) {
        await supabase
          .from("round_participants")
          .update({ status: "absent", score: 0, evaluated_at: new Date().toISOString() })
          .eq("drive_round_id", roundId)
          .in("student_id", absents);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
