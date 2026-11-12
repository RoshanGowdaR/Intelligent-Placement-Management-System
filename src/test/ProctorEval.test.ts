import { describe, it, expect } from "vitest";
import proctorConfig from "../../configs/proctor.config.json";
import { findProhibitedGadget, getGadgetDisplayName } from "@/lib/proctorDetection";

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


describe("WebcamProctor Device Detection Filtering", () => {
  const frame = { videoW: 640, videoH: 480 };

  it("ignores low-confidence noise and background 'remote'/'keyboard'/'mouse' false positives", () => {
    const result = findProhibitedGadget(
      [
        { class: "cell phone", score: 0.18, bbox: [100, 100, 80, 140] },
        { class: "cell phone", score: 0.42, bbox: [120, 90, 90, 160] },
        { class: "remote", score: 0.79, bbox: [200, 100, 70, 150] },
        { class: "keyboard", score: 0.85, bbox: [50, 350, 300, 100] },
        { class: "mouse", score: 0.88, bbox: [400, 380, 60, 50] },
        { class: "clock", score: 0.91, bbox: [500, 40, 80, 80] },
      ],
      {
        confidenceThreshold: 0.35, // Even if test config has lower value, safety floor applies
        watchedClasses: ["cell phone", "remote", "keyboard", "mouse", "laptop", "tablet", "book"],
        ...frame,
      }
    );
    expect(result).toBeNull();
  });

  it("rejects background wall/ceiling surfaces and tiny specks even if misclassified as cell phone", () => {
    const result = findProhibitedGadget(
      [
        // Huge wall / ceiling box > 55% of frame
        { class: "cell phone", score: 0.82, bbox: [10, 10, 580, 420] },
        // Tiny speck < 4% width/height
        { class: "cell phone", score: 0.78, bbox: [200, 200, 15, 25] },
        // Skinny vertical light strip / door edge (aspect ratio < 0.25)
        { class: "cell phone", score: 0.75, bbox: [10, 10, 28, 300] },
      ],
      {
        confidenceThreshold: 0.58,
        watchedClasses: ["cell phone"],
        ...frame,
      }
    );
    expect(result).toBeNull();
  });

  it("flags an actual mobile phone held in frame above confidence floor", () => {
    const result = findProhibitedGadget(
      [
        { class: "person", score: 0.94, bbox: [120, 40, 340, 420] },
        { class: "cell phone", score: 0.74, bbox: [310, 210, 95, 165] },
      ],
      {
        confidenceThreshold: 0.58,
        watchedClasses: ["cell phone", "laptop", "tablet", "book"],
        ...frame,
      }
    );
    expect(result).not.toBeNull();
    expect(result?.class).toBe("cell phone");
    expect(getGadgetDisplayName(result!.class)).toBe("Mobile Phone / Smartphone");
  });
});
