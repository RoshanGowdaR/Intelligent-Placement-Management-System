import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type DriveRound = Database["public"]["Tables"]["drive_rounds"]["Row"];
export type RoundParticipant = Database["public"]["Tables"]["round_participants"]["Row"];
export type PassingLogic = DriveRound["passing_logic"];
export type RoundType = DriveRound["round_type"];
export type ParticipantStatus = RoundParticipant["status"];

export interface CandidateScore {
  studentId: string;
  score: number;
}

export interface CandidateResult {
  studentId: string;
  score: number;
  status: "qualified" | "not_qualified";
}

/**
 * Pure function: calculates qualified vs not_qualified given scores and passing logic
 */
export function computePassingStatus(
  candidates: CandidateScore[],
  logic: PassingLogic,
  passingValue: number | null
): CandidateResult[] {
  if (!candidates || candidates.length === 0) return [];

  // Sort candidates by score descending
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const total = sorted.length;

  switch (logic) {
    case "cutoff_score": {
      const cutoff = passingValue ?? 0;
      return sorted.map((c) => ({
        studentId: c.studentId,
        score: c.score,
        status: c.score >= cutoff ? "qualified" : "not_qualified",
      }));
    }

    case "top_n": {
      const topN = Math.max(0, Math.floor(passingValue ?? 0));
      return sorted.map((c, idx) => ({
        studentId: c.studentId,
        score: c.score,
        status: idx < topN ? "qualified" : "not_qualified",
      }));
    }

    case "top_percent": {
      const percent = Math.min(100, Math.max(0, passingValue ?? 0));
      // Calculate how many candidates qualify based on percentage
      const count = Math.ceil((percent / 100) * total);
      return sorted.map((c, idx) => ({
        studentId: c.studentId,
        score: c.score,
        status: idx < count ? "qualified" : "not_qualified",
      }));
    }

    case "manual":
    default:
      return sorted.map((c) => ({
        studentId: c.studentId,
        score: c.score,
        status: "not_qualified",
      }));
  }
}

/**
 * Validates whether a given round can transition or be opened.
 * Enforces strict sequential order: Round N cannot open unless Round N-1 is published.
 */
export function canOpenRound(
  roundNumber: number,
  allRounds: DriveRound[]
): { allowed: boolean; reason?: string } {
  if (roundNumber <= 1) return { allowed: true };

  const prevRound = allRounds.find((r) => r.round_number === roundNumber - 1);
  if (!prevRound) {
    return { allowed: false, reason: `Previous Round (${roundNumber - 1}) does not exist.` };
  }
  if (!prevRound.is_published) {
    return {
      allowed: false,
      reason: `Cannot open Round ${roundNumber}. Round ${roundNumber - 1} results must be published first.`,
    };
  }
  return { allowed: true };
}

/**
 * Service: Open Round N
 * 1. Validates prior round sequence.
 * 2. Populates round_participants (Round 1: eligible candidates; Round N > 1: qualified from Round N-1).
 * 3. Sends notification to participants.
 */
export async function openRound(
  roundId: string,
  userId: string
): Promise<{ success: boolean; participantCount: number; message: string }> {
  // 1. Fetch round & all company rounds
  const { data: targetRound, error: roundErr } = await supabase
    .from("drive_rounds")
    .select("*, companies(*)")
    .eq("id", roundId)
    .single();

  if (roundErr || !targetRound) throw new Error("Drive round not found");

  const { data: allRounds } = await supabase
    .from("drive_rounds")
    .select("*")
    .eq("company_id", targetRound.company_id)
    .order("round_number", { ascending: true });

  const validation = canOpenRound(targetRound.round_number, (allRounds ?? []) as DriveRound[]);
  if (!validation.allowed) {
    throw new Error(validation.reason);
  }

  let eligibleStudentIds: string[] = [];

  if (targetRound.round_number === 1) {
    // Round 1: Gather eligible students for company
    const { data: profiles } = await supabase.from("profiles").select("id, cgpa, branch");
    const company = targetRound.companies as any;
    const criteria = (company?.eligibility_criteria as Record<string, any>) ?? {};
    const allowedBranches = (company?.allowed_branches as string[]) ?? [];

    eligibleStudentIds = (profiles ?? [])
      .filter((p) => {
        const cgpaOk = !criteria.min_cgpa || (p.cgpa && p.cgpa >= criteria.min_cgpa);
        const branchOk = allowedBranches.length === 0 || (p.branch && allowedBranches.includes(p.branch));
        return cgpaOk && branchOk;
      })
      .map((p) => p.id);
  } else {
    // Round N > 1: Only students who QUALIFIED in Round N-1
    const prevRound = (allRounds ?? []).find((r) => r.round_number === targetRound.round_number - 1);
    if (!prevRound) throw new Error("Previous round missing");

    const { data: prevQualified } = await supabase
      .from("round_participants")
      .select("student_id")
      .eq("drive_round_id", prevRound.id)
      .eq("status", "qualified");

    eligibleStudentIds = (prevQualified ?? []).map((p) => p.student_id);
  }

  if (eligibleStudentIds.length === 0) {
    return { success: true, participantCount: 0, message: "No eligible candidates found for this round." };
  }

  // Upsert participants into round_participants
  const participantsToInsert = eligibleStudentIds.map((studentId) => ({
    drive_round_id: roundId,
    student_id: studentId,
    status: "pending" as const,
  }));

  const { error: insertErr } = await supabase
    .from("round_participants")
    .upsert(participantsToInsert, { onConflict: "drive_round_id,student_id" });

  if (insertErr) throw insertErr;

  // Broadcast in-app notification to all participants
  const notifications = eligibleStudentIds.map((studentId) => ({
    user_id: studentId,
    title: `🎯 Round ${targetRound.round_number}: ${targetRound.round_name} is Open`,
    message: `You are eligible and enrolled for Round ${targetRound.round_number} (${targetRound.round_name}) with ${(targetRound.companies as any)?.name || "Visiting Company"}. Check your timeline!`,
    type: "info",
    link: `/dashboard/companies/${targetRound.company_id}`,
  }));

  await supabase.from("notifications").insert(notifications);

  return {
    success: true,
    participantCount: eligibleStudentIds.length,
    message: `Round ${targetRound.round_number} opened successfully with ${eligibleStudentIds.length} candidate(s).`,
  };
}

/**
 * Service: Close Round & Score
 * Calculates passing status for test-type rounds or sets absents.
 */
export async function closeRoundAndScore(
  roundId: string
): Promise<{ success: boolean; scoredCount: number }> {
  const { data: round, error: roundErr } = await supabase
    .from("drive_rounds")
    .select("*")
    .eq("id", roundId)
    .single();

  if (roundErr || !round) throw new Error("Round not found");

  const { data: participants, error: partErr } = await supabase
    .from("round_participants")
    .select("*")
    .eq("drive_round_id", roundId);

  if (partErr || !participants || participants.length === 0) {
    return { success: true, scoredCount: 0 };
  }

  // If this is an assessment / test round with an associated test_id
  if (round.round_type === "test" && round.test_id) {
    const studentIds = participants.map((p) => p.student_id);

    // Fetch highest test scores for these students
    const { data: attempts } = await supabase
      .from("test_attempts")
      .select("student_id, total_score")
      .eq("test_id", round.test_id)
      .in("student_id", studentIds);

    const scoreMap: Record<string, number> = {};
    (attempts ?? []).forEach((att) => {
      scoreMap[att.student_id] = Math.max(scoreMap[att.student_id] ?? 0, att.total_score);
    });

    // Partition into attempters vs absents
    const attempters: CandidateScore[] = [];
    const absents: string[] = [];

    participants.forEach((p) => {
      if (scoreMap[p.student_id] !== undefined) {
        attempters.push({ studentId: p.student_id, score: scoreMap[p.student_id] });
      } else {
        absents.push(p.student_id);
      }
    });

    // Compute qualified / not_qualified for attempters
    const results = computePassingStatus(attempters, round.passing_logic, round.passing_value);

    // Update participants in database
    for (const res of results) {
      await supabase
        .from("round_participants")
        .update({
          score: res.score,
          status: res.status,
          evaluated_at: new Date().toISOString(),
        })
        .eq("drive_round_id", roundId)
        .eq("student_id", res.studentId);
    }

    // Mark absents
    if (absents.length > 0) {
      await supabase
        .from("round_participants")
        .update({
          status: "absent",
          score: 0,
          evaluated_at: new Date().toISOString(),
        })
        .eq("drive_round_id", roundId)
        .in("student_id", absents);
    }

    return { success: true, scoredCount: results.length + absents.length };
  }

  return { success: true, scoredCount: 0 };
}

/**
 * Service: Record Interview / Manual Result
 */
export async function recordInterviewResult(
  participantId: string,
  score: number | null,
  status: "qualified" | "not_qualified",
  recruiterNotes: string,
  evaluatorId: string
) {
  const { error } = await supabase
    .from("round_participants")
    .update({
      score,
      status,
      recruiter_notes: recruiterNotes.trim(),
      evaluated_by: evaluatorId,
      evaluated_at: new Date().toISOString(),
    })
    .eq("id", participantId);

  if (error) throw error;
  return { success: true };
}

/**
 * Service: Publish Round Results
 * Enforces Batch Release rule:
 * 1. Checks that all participants have a non-pending status.
 * 2. Sets is_published = true, published_at = now().
 * 3. Simultaneously notifies all participants (both qualified and not_qualified).
 * 4. Logs to audit_logs.
 * 5. Optionally triggers next round if auto_progress is enabled.
 */
export async function publishRoundResults(
  roundId: string,
  evaluatorId: string,
  autoProgress: boolean = false
): Promise<{ success: boolean; publishedCount: number }> {
  const { data: round, error: roundErr } = await supabase
    .from("drive_rounds")
    .select("*, companies(*)")
    .eq("id", roundId)
    .single();

  if (roundErr || !round) throw new Error("Round not found");

  const { data: participants, error: partErr } = await supabase
    .from("round_participants")
    .select("*, profiles(id, name, email)")
    .eq("drive_round_id", roundId);

  if (partErr || !participants || participants.length === 0) {
    throw new Error("No candidates found in this round to publish.");
  }

  // Validate: all participants must have non-pending status (Strict Batch Release Rule)
  const pendingCandidates = participants.filter((p) => p.status === "pending");
  if (pendingCandidates.length > 0) {
    throw new Error(
      `Cannot publish results. ${pendingCandidates.length} candidate(s) are still pending evaluation. All candidates must be evaluated before batch release.`
    );
  }

  const now = new Date().toISOString();

  // 1. Lock and publish round
  const { error: updateErr } = await supabase
    .from("drive_rounds")
    .update({
      is_published: true,
      published_at: now,
      auto_progress: autoProgress,
    })
    .eq("id", roundId);

  if (updateErr) throw updateErr;

  // 2. Mark notified_at on participants
  await supabase
    .from("round_participants")
    .update({ notified_at: now })
    .eq("drive_round_id", roundId);

  // 3. Batch simultaneous in-app notifications
  const notifications = participants.map((p) => {
    const isQualified = p.status === "qualified";
    const emoji = isQualified ? "🎉" : "📋";
    const companyName = (round.companies as any)?.name || "Company";

    return {
      user_id: p.student_id,
      title: `${emoji} Round ${round.round_number} Results Published: ${round.round_name}`,
      message: isQualified
        ? `Congratulations! You have qualified Round ${round.round_number} (${round.round_name}) with ${companyName}. View your drive progress for next steps!`
        : `Results for Round ${round.round_number} (${round.round_name}) with ${companyName} are now finalized. Thank you for your participation.`,
      type: isQualified ? "test_result" : "info",
      link: `/dashboard/companies/${round.company_id}`,
    };
  });

  await supabase.from("notifications").insert(notifications);

  // 4. Log to audit_logs
  try {
    await supabase.from("audit_logs").insert({
      action: "publish_drive_round_results",
      target: `round_${round.round_number}_${round.round_name}`,
      details: {
        round_id: roundId,
        company_id: round.company_id,
        total_participants: participants.length,
        qualified: participants.filter((p) => p.status === "qualified").length,
        not_qualified: participants.filter((p) => p.status === "not_qualified").length,
        absent: participants.filter((p) => p.status === "absent").length,
        published_by: evaluatorId,
      },
    });
  } catch (_) {}

  // 5. If auto_progress is enabled, find Round N+1 and open it
  if (autoProgress) {
    const { data: nextRound } = await supabase
      .from("drive_rounds")
      .select("id")
      .eq("company_id", round.company_id)
      .eq("round_number", round.round_number + 1)
      .maybeSingle();

    if (nextRound) {
      try {
        await openRound(nextRound.id, evaluatorId);
      } catch (e) {
        console.warn("Auto-progression openRound warning:", e);
      }
    }
  }

  return { success: true, publishedCount: participants.length };
}
