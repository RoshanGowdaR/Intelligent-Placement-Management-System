export interface CocoPrediction {
  class: string;
  score: number;
  bbox: [number, number, number, number];
}

export const STRICT_PROHIBITED_CLASSES = new Set([
  "cell phone",
  "tablet",
  "laptop",
  "tv",
  "book",
]);

/**
 * Checks whether a COCO-SSD bounding box has plausible geometry for a real
 * handheld/desk device in a webcam frame, filtering out tiny noise specks,
 * skinny wall/door-frame edges, and huge background surfaces.
 */
export function isPlausibleDeviceBox(
  bbox: [number, number, number, number],
  cls: string,
  videoW: number,
  videoH: number
): boolean {
  const [, , w, h] = bbox;
  if (w <= 0 || h <= 0 || videoW <= 0 || videoH <= 0) return false;

  // Reject tiny specks (< 4% of frame dimensions)
  if (w < videoW * 0.04 || h < videoH * 0.04) return false;

  // Reject huge background regions (walls, doors, ceilings covering > 55% of frame)
  const areaRatio = (w * h) / (videoW * videoH);
  if (areaRatio > 0.55) return false;

  // Reject skinny edge artifacts (blinds, door frames, light strips) for phones
  if (cls === "cell phone") {
    const aspect = w / h;
    if (aspect < 0.25 || aspect > 4.0) return false;
  }

  return true;
}

export function getGadgetDisplayName(cls: string): string {
  switch (cls.toLowerCase()) {
    case "cell phone":
      return "Mobile Phone / Smartphone";
    case "laptop":
      return "Secondary Laptop / Screen";
    case "tablet":
      return "Tablet / Digital Device";
    case "tv":
      return "External Monitor / TV";
    case "book":
      return "Reference Book / Notes";
    default:
      return cls;
  }
}

/**
 * Evaluates COCO-SSD predictions and returns the highest-confidence valid
 * prohibited device detection, enforcing strict confidence floors so normal
 * room backgrounds and desks never trigger false "Mobile Phone" warnings.
 */
export function findProhibitedGadget(
  predictions: CocoPrediction[],
  options: {
    confidenceThreshold?: number;
    watchedClasses?: string[];
    videoW: number;
    videoH: number;
  }
): CocoPrediction | null {
  const {
    confidenceThreshold = 0.58,
    watchedClasses = ["cell phone", "laptop", "tablet", "book"],
    videoW,
    videoH,
  } = options;

  const phoneFloor = Math.max(0.50, confidenceThreshold);
  const secondaryFloor = Math.max(0.68, confidenceThreshold);
  const watchedSet = new Set(watchedClasses.map((c) => c.toLowerCase()));

  let best: CocoPrediction | null = null;

  for (const pred of predictions) {
    const cls = (pred.class || "").toLowerCase();
    if (!STRICT_PROHIBITED_CLASSES.has(cls)) continue;
    if (!watchedSet.has(cls)) continue;

    const minScore = cls === "cell phone" ? phoneFloor : secondaryFloor;
    if (pred.score < minScore) continue;
    if (!isPlausibleDeviceBox(pred.bbox, cls, videoW, videoH)) continue;

    if (!best || pred.score > best.score) {
      best = pred;
    }
  }

  return best;
}
