import { describe, it, expect } from "vitest";
import proctorConfig from "../configs/proctor.config.json";

describe("Evaluation Benchmark: Proctoring Anti-Cheat Pipeline", () => {
  const { integrityScore, tabSwitches, computerVision } = proctorConfig.proctoring;

  function evaluateCandidateAttempt(data: {
    tabSwitches: number;
    gadgetDetected: boolean;
    autoSubmitted: boolean;
  }) {
    let score =
      integrityScore.baseScore -
      data.tabSwitches * tabSwitches.deductionPointsPerSwitch -
      (data.gadgetDetected ? computerVision.deductionPointsPerGadgetViolation : 0);

    if (data.autoSubmitted) {
      score = Math.min(score, integrityScore.autoSubmitMaxScore);
    }
    score = Math.max(0, Math.min(100, score));

    const status =
      score >= integrityScore.cleanThreshold
        ? "Clean"
        : score >= integrityScore.suspiciousThreshold
        ? "Warning"
        : "Cheat";

    return { score, status };
  }

  it("should benchmark zero-violation attempts as 100% Clean", () => {
    const result = evaluateCandidateAttempt({
      tabSwitches: 0,
      gadgetDetected: false,
      autoSubmitted: false,
    });
    expect(result.score).toBe(100);
    expect(result.status).toBe("Clean");
  });

  it("should benchmark minor tab switches within warning bounds", () => {
    const result = evaluateCandidateAttempt({
      tabSwitches: 1,
      gadgetDetected: false,
      autoSubmitted: false,
    });
    // 100 - 15 = 85 -> exactly cleanThreshold
    expect(result.score).toBe(85);
    expect(result.status).toBe("Clean");

    const result2 = evaluateCandidateAttempt({
      tabSwitches: 2,
      gadgetDetected: false,
      autoSubmitted: false,
    });
    // 100 - 30 = 70 -> Warning
    expect(result2.score).toBe(70);
    expect(result2.status).toBe("Warning");
  });

  it("should benchmark cellphone detection as severe integrity drop", () => {
    const result = evaluateCandidateAttempt({
      tabSwitches: 1,
      gadgetDetected: true,
      autoSubmitted: false,
    });
    // 100 - 15 - 40 = 45 -> Cheat
    expect(result.score).toBe(45);
    expect(result.status).toBe("Cheat");
  });

  it("should benchmark auto-submitted attempts with strict penalty <= 20", () => {
    const result = evaluateCandidateAttempt({
      tabSwitches: 3,
      gadgetDetected: false,
      autoSubmitted: true,
    });
    expect(result.score).toBeLessThanOrEqual(20);
    expect(result.status).toBe("Cheat");
  });
});
