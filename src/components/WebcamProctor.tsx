import { useEffect, useRef, useState } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as blazeface from "@tensorflow-models/blazeface";
import "@tensorflow/tfjs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, Video, VideoOff, Eye, Users, Smartphone } from "lucide-react";
import { toast } from "sonner";

export const DEFAULT_GADGET_CLASSES: string[] = [
  "cell phone",
  "laptop",
  "tv",
  "remote",
  "keyboard",
  "mouse",
  "tablet",
  "book",
];

export interface ProctorEvent {
  timestamp: string;
  gadget: string;
  action: "warning" | "auto_submit";
}

export interface ProctorConfig {
  warning_delay_seconds: number;
  second_offense_action: "submit" | "warn";
  detection_interval_ms: number;
  confidence_threshold: number;
  consecutive_frames: number;
  watched_classes: string[];
}

interface WebcamProctorProps {
  active: boolean;
  onAutoSubmit: () => void;
  onEvent?: (event: ProctorEvent) => void;
  config?: Partial<ProctorConfig>;
}

const DEFAULT_CONFIG: ProctorConfig = {
  warning_delay_seconds: 6,
  second_offense_action: "submit",
  detection_interval_ms: 500,
  confidence_threshold: 0.14,
  consecutive_frames: 1,
  watched_classes: DEFAULT_GADGET_CLASSES,
};

// Web Audio API beep synthesizer for instant auditory feedback
function playProctorAlertSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio context may be restricted before user gesture
  }
}

interface ViolationState {
  type: "gadget" | "multiple_people" | "gaze" | "no_face";
  name: string;
  description: string;
}

export default function WebcamProctor({ active, onAutoSubmit, onEvent, config }: WebcamProctorProps) {
  const cfg: ProctorConfig = { ...DEFAULT_CONFIG, ...(config || {}) };
  const graceSeconds = cfg.warning_delay_seconds || 6;

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cocoModelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const blazeModelRef = useRef<blazeface.BlazeFaceModel | null>(null);

  const detectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedRef = useRef(false);
  const warnedOnceRef = useRef(false);
  const lastSoundRef = useRef<number>(0);

  // Consecutive counters to filter camera noise
  const gazeAwayFramesRef = useRef(0);
  const noFaceFramesRef = useRef(0);

  const onEventRef = useRef(onEvent);
  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeViolation, setActiveViolation] = useState<ViolationState | null>(null);
  const [countdown, setCountdown] = useState<number>(graceSeconds);

  // Status indicator in preview
  const [previewStatus, setPreviewStatus] = useState<"ok" | "gaze" | "multi" | "gadget" | "noface">("ok");

  // 1. Initialize camera stream and dual AI models (COCO-SSD + BlazeFace)
  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraReady(true);

        // Load dual models concurrently
        const [cocoModel, blazeModel] = await Promise.all([
          cocoSsd.load({ base: "mobilenet_v2" }),
          blazeface.load(),
        ]);

        if (cancelled) return;
        cocoModelRef.current = cocoModel;
        blazeModelRef.current = blazeModel;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unable to access webcam";
        setCameraError(msg);
        toast.error("Webcam required for proctoring: " + msg);
      }
    })();

    return () => {
      cancelled = true;
      if (detectIntervalRef.current) clearInterval(detectIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      cocoModelRef.current = null;
      blazeModelRef.current = null;
    };
  }, [active]);

  const activeViolationRef = useRef<ViolationState | null>(null);
  useEffect(() => { activeViolationRef.current = activeViolation; }, [activeViolation]);

  // 2. Continuous Real-Time Vision Inference Pipeline
  useEffect(() => {
    if (!active || !cameraReady) return;

    const watchedSet = new Set(cfg.watched_classes && cfg.watched_classes.length ? cfg.watched_classes : DEFAULT_GADGET_CLASSES);
    // Extra-sensitive detection thresholds for mobile phones and handheld gadgets
    const phoneThreshold = 0.14;
    const gadgetThreshold = 0.18;

    const runDualDetection = async () => {
      if (!cocoModelRef.current || !blazeModelRef.current || !videoRef.current || videoRef.current.readyState < 2) return;
      if (submittedRef.current) return;

      try {
        const video = videoRef.current;

        // Run both models
        const [cocoPreds, blazeFaces] = await Promise.all([
          cocoModelRef.current.detect(video),
          blazeModelRef.current.estimateFaces(video, false),
        ]);

        let detectedViol: ViolationState | null = null;

        // --- CHECK A: DIGITAL GADGETS & CELL PHONES (COCO-SSD) ---
        const foundGadget = cocoPreds.find((p) => {
          const isPhone = p.class === "cell phone";
          const isRemote = p.class === "remote"; // Handheld phones often register as remote
          const threshold = isPhone ? phoneThreshold : isRemote ? 0.16 : gadgetThreshold;
          return p.score >= threshold && (watchedSet.has(p.class) || isPhone || isRemote);
        });

        if (foundGadget) {
          const gadgetName = (foundGadget.class === "cell phone" || foundGadget.class === "remote")
            ? "Mobile Phone / Cell Phone"
            : foundGadget.class === "laptop"
            ? "Secondary Laptop / Screen"
            : foundGadget.class;

          detectedViol = {
            type: "gadget",
            name: gadgetName,
            description: `A prohibited device (${gadgetName}) was detected in your camera frame. Please remove all digital gadgets immediately.`,
          };
          setPreviewStatus("gadget");
        }

        // --- CHECK B: MULTIPLE PEOPLE IN FRAME (BlazeFace + COCO-SSD) ---
        if (!detectedViol) {
          // BlazeFace detects faces even with partial view / distance
          const faceCount = blazeFaces.length;
          // Also check COCO-SSD person detection
          const personCount = cocoPreds.filter((p) => p.class === "person" && p.score >= 0.22).length;

          if (faceCount > 1 || personCount > 1) {
            const count = Math.max(faceCount, personCount);
            detectedViol = {
              type: "multiple_people",
              name: `Multiple People in Camera View (${count} people detected)`,
              description: "The assessment must be taken alone in a quiet room. Please ensure no other people are present in your camera view.",
            };
            setPreviewStatus("multi");
          }
        }

        // --- CHECK C: FACE ABSENCE & HEAD POSE / GAZE DIRECTION ---
        if (!detectedViol) {
          if (blazeFaces.length === 0) {
            noFaceFramesRef.current += 1;
            if (noFaceFramesRef.current >= 3) {
              detectedViol = {
                type: "no_face",
                name: "Candidate Face Not Visible",
                description: "You must remain seated directly in front of the camera with your face clearly visible throughout the exam.",
              };
              setPreviewStatus("noface");
            }
          } else {
            noFaceFramesRef.current = 0;

            // Analyze head pose / gaze of primary candidate (largest face)
            const primaryFace = blazeFaces.reduce((prev, curr) => {
              const prevW = Math.abs((prev.bottomRight as [number, number])[0] - (prev.topLeft as [number, number])[0]);
              const currW = Math.abs((curr.bottomRight as [number, number])[0] - (curr.topLeft as [number, number])[0]);
              return currW > prevW ? curr : prev;
            }, blazeFaces[0]);

            const landmarks = primaryFace.landmarks as [number, number][];
            if (landmarks && landmarks.length >= 4) {
              const rightEye = landmarks[0];
              const leftEye = landmarks[1];
              const nose = landmarks[2];
              const mouth = landmarks[3];

              const eyeDist = Math.hypot(leftEye[0] - rightEye[0], leftEye[1] - rightEye[1]);
              if (eyeDist > 10) {
                // Horizontal yaw: offset of nose relative to eye center
                const midEyeX = (rightEye[0] + leftEye[0]) / 2;
                const yawOffset = (nose[0] - midEyeX) / eyeDist;

                // Vertical pitch: offset of nose relative to eye-mouth distance
                const midEyeY = (rightEye[1] + leftEye[1]) / 2;
                const eyeToMouth = Math.abs(mouth[1] - midEyeY);
                const pitchRatio = (nose[1] - midEyeY) / Math.max(1, eyeToMouth);

                // Normal straight facing: yawOffset in [-0.18, 0.18], pitchRatio in [0.45, 0.70]
                const isLookingLeft = yawOffset > 0.28;
                const isLookingRight = yawOffset < -0.28;
                const isLookingDown = pitchRatio > 0.82;

                if (isLookingLeft || isLookingRight || isLookingDown) {
                  gazeAwayFramesRef.current += 1;
                  if (gazeAwayFramesRef.current >= 2) {
                    const direction = isLookingLeft ? "Left" : isLookingRight ? "Right" : "Down";
                    detectedViol = {
                      type: "gaze",
                      name: `Looking Away from Test Screen (${direction})`,
                      description: "Your focus must remain strictly on the examination screen. Do not look away to the left, right, or down.",
                    };
                    setPreviewStatus("gaze");
                  }
                } else {
                  gazeAwayFramesRef.current = 0;
                  setPreviewStatus("ok");
                }
              }
            }
          }
        }

        // Apply detected violation or clear
        if (detectedViol) {
          const now = Date.now();
          if (now - lastSoundRef.current > 4000) {
            playProctorAlertSound();
            lastSoundRef.current = now;
          }

          if (warnedOnceRef.current && !activeViolationRef.current) {
            if (cfg.second_offense_action === "submit" && !submittedRef.current) {
              submittedRef.current = true;
              onEventRef.current?.({ timestamp: new Date().toISOString(), gadget: detectedViol.name, action: "auto_submit" });
              toast.error(`🚫 Repeated integrity violation (${detectedViol.name}). Auto-submitting assessment.`);
              onAutoSubmit();
              return;
            }
          }

          setActiveViolation(detectedViol);
        } else {
          setActiveViolation(null);
          setPreviewStatus("ok");
        }
      } catch {
        // ignore occasional tensor inference frame drops
      }
    };

    detectIntervalRef.current = setInterval(runDualDetection, cfg.detection_interval_ms || 500);
    return () => {
      if (detectIntervalRef.current) clearInterval(detectIntervalRef.current);
    };
  }, [active, cameraReady, onAutoSubmit, cfg.detection_interval_ms, cfg.second_offense_action, cfg.confidence_threshold, cfg.consecutive_frames, cfg.watched_classes]);

  // 3. Grace Period Countdown & Auto-Submit Timer
  useEffect(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (!activeViolation) {
      setCountdown(graceSeconds);
      return;
    }

    warnedOnceRef.current = true;
    onEventRef.current?.({ timestamp: new Date().toISOString(), gadget: activeViolation.name, action: "warning" });
    toast.warning(`⚠️ Integrity alert: ${activeViolation.name}! Correct within ${graceSeconds}s.`, { duration: 5000 });
    setCountdown(graceSeconds);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          if (!submittedRef.current) {
            submittedRef.current = true;
            onEventRef.current?.({
              timestamp: new Date().toISOString(),
              gadget: activeViolation.name,
              action: "auto_submit",
            });
            toast.error(`🚫 Integrity violation not corrected in time (${activeViolation.name}). Auto-submitting assessment.`);
            onAutoSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [activeViolation, onAutoSubmit, graceSeconds]);

  if (!active) return null;

  return (
    <>
      {/* Floating webcam preview (bottom-left) */}
      <div className="fixed bottom-4 left-4 z-[60] w-52 overflow-hidden rounded-2xl border-2 border-primary/50 bg-black/90 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between bg-zinc-900/90 px-3 py-1.5 text-xs border-b border-border/40">
          <span className="flex items-center gap-1.5 font-bold text-[11px] text-zinc-200">
            {cameraReady ? <Video className="h-3.5 w-3.5 text-emerald-400" /> : <VideoOff className="h-3.5 w-3.5 text-destructive" />}
            Live Proctor
          </span>

          {/* Status Badge */}
          {cameraReady && (
            <span className="flex items-center gap-1 text-[10px] font-semibold">
              {previewStatus === "ok" && (
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Solo &amp; Focused
                </span>
              )}
              {previewStatus === "gaze" && (
                <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                  <Eye className="h-3 w-3" /> Focus Away
                </span>
              )}
              {previewStatus === "multi" && (
                <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                  <Users className="h-3 w-3" /> Multiple
                </span>
              )}
              {previewStatus === "gadget" && (
                <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                  <Smartphone className="h-3 w-3" /> Gadget
                </span>
              )}
              {previewStatus === "noface" && (
                <span className="inline-flex items-center gap-1 text-amber-400">
                  No Face
                </span>
              )}
            </span>
          )}
        </div>

        <div className="relative">
          <video ref={videoRef} muted playsInline className="h-32 w-full object-cover" />
          {cameraError && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-2 text-center text-[10px] text-destructive">
              {cameraError}
            </div>
          )}
        </div>
      </div>

      {/* High-Visibility Floating Warning Banner */}
      {activeViolation && (
        <div className="fixed left-1/2 top-4 z-[99] w-full max-w-xl -translate-x-1/2 px-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <Alert variant="destructive" className="border-2 border-destructive bg-card/95 text-foreground shadow-2xl backdrop-blur-xl">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <AlertTitle className="font-bold text-sm text-destructive flex items-center justify-between">
                <span>{activeViolation.name}</span>
                <span className="text-xs font-mono font-black px-2 py-0.5 rounded-full bg-destructive text-white">
                  {countdown}s remaining
                </span>
              </AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {activeViolation.description}
              </AlertDescription>
            </div>
          </Alert>
        </div>
      )}
    </>
  );
}
