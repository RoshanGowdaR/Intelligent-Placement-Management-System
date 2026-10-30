import { useEffect, useRef, useState, useCallback } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as blazeface from "@tensorflow-models/blazeface";
import "@tensorflow/tfjs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, Video, VideoOff, Eye, Users, Smartphone } from "lucide-react";
import { toast } from "sonner";

export const DEFAULT_GADGET_CLASSES: string[] = [
  "cell phone",
  "remote",
  "laptop",
  "tv",
  "tablet",
  "book",
  "camera",
  "keyboard",
  "mouse",
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
  detection_interval_ms: 400,
  confidence_threshold: 0.10,
  consecutive_frames: 1,
  watched_classes: DEFAULT_GADGET_CLASSES,
};

// Web Audio API sound generator for immediate proctor warning alert
function playProctorAlertSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(540, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(920, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.38);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.38);
  } catch {
    // Audio context may be restricted before user gesture
  }
}

interface ViolationState {
  type: "gadget" | "multiple_people" | "gaze" | "no_face";
  name: string;
  description: string;
}

interface DetectedBox {
  bbox: [number, number, number, number]; // [x, y, width, height]
  label: string;
  isViolation: boolean;
}

export default function WebcamProctor({ active, onAutoSubmit, onEvent, config }: WebcamProctorProps) {
  const cfg: ProctorConfig = { ...DEFAULT_CONFIG, ...(config || {}) };
  const graceSeconds = cfg.warning_delay_seconds || 6;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // AI models refs (loaded independently so failure of one does not break the other)
  const cocoModelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const blazeModelRef = useRef<blazeface.BlazeFaceModel | null>(null);
  const nativeFaceDetectorRef = useRef<any>(null);

  const detectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedRef = useRef(false);
  const warnedOnceRef = useRef(false);
  const lastSoundRef = useRef<number>(0);

  // Consecutive counters to filter camera noise
  const gazeAwayFramesRef = useRef(0);
  const noFaceFramesRef = useRef(0);
  const multiPersonFramesRef = useRef(0);
  const gadgetFramesRef = useRef(0);

  const onEventRef = useRef(onEvent);
  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeViolation, setActiveViolation] = useState<ViolationState | null>(null);
  const [countdown, setCountdown] = useState<number>(graceSeconds);

  // Live status badge
  const [previewStatus, setPreviewStatus] = useState<"ok" | "gaze" | "multi" | "gadget" | "noface">("ok");
  const [personCount, setPersonCount] = useState<number>(1);

  // 1. Initialize camera stream and load AI models with resilient independent fallbacks
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
        setCameraError(null);

        // Tier 1: Hardware-Accelerated Chromium Native FaceDetector API (Instant, zero network)
        if (typeof window !== "undefined" && "FaceDetector" in window) {
          try {
            nativeFaceDetectorRef.current = new (window as any).FaceDetector({
              fastMode: true,
              maxDetectedFaces: 10,
            });
            console.log("[WebcamProctor] Native FaceDetector initialized successfully");
          } catch (e) {
            console.warn("[WebcamProctor] Native FaceDetector error:", e);
          }
        }

        // Tier 2: COCO-SSD Object & Gadget & Person Detector (Loaded independently)
        cocoSsd.load({ base: "mobilenet_v2" })
          .then((model) => {
            if (!cancelled) {
              cocoModelRef.current = model;
              console.log("[WebcamProctor] COCO-SSD mobilenet_v2 loaded successfully");
            }
          })
          .catch((err) => {
            console.warn("[WebcamProctor] mobilenet_v2 load failed, falling back to lite_mobilenet_v2...", err);
            cocoSsd.load({ base: "lite_mobilenet_v2" })
              .then((liteModel) => {
                if (!cancelled) {
                  cocoModelRef.current = liteModel;
                  console.log("[WebcamProctor] COCO-SSD lite_mobilenet_v2 loaded successfully");
                }
              })
              .catch((e2) => {
                console.error("[WebcamProctor] COCO-SSD all variants failed to load:", e2);
              });
          });

        // Tier 3: BlazeFace Model (Loaded independently; non-blocking)
        blazeface.load({ maxFaces: 10, scoreThreshold: 0.25 })
          .then((bModel) => {
            if (!cancelled) {
              blazeModelRef.current = bModel;
              console.log("[WebcamProctor] BlazeFace loaded successfully");
            }
          })
          .catch((bErr) => {
            console.warn("[WebcamProctor] BlazeFace optional load failed (using Native FaceDetector & COCO-SSD):", bErr);
          });

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
      nativeFaceDetectorRef.current = null;
    };
  }, [active]);

  const activeViolationRef = useRef<ViolationState | null>(null);
  useEffect(() => { activeViolationRef.current = activeViolation; }, [activeViolation]);

  // Helper: Draw visual bounding boxes on canvas overlay
  const drawOverlayBoxes = useCallback((boxes: DetectedBox[], videoW: number, videoH: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (canvas.width !== videoW || canvas.height !== videoH) {
      canvas.width = videoW;
      canvas.height = videoH;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const b of boxes) {
      const [x, y, w, h] = b.bbox;
      ctx.lineWidth = b.isViolation ? 3 : 2;
      ctx.strokeStyle = b.isViolation ? "#ef4444" : "#10b981";
      ctx.strokeRect(x, y, w, h);

      // Label badge
      ctx.fillStyle = b.isViolation ? "rgba(239, 68, 68, 0.88)" : "rgba(16, 185, 129, 0.88)";
      ctx.fillRect(x, Math.max(0, y - 20), Math.min(w, 140), 20);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(b.label, x + 4, Math.max(14, y - 5));
    }
  }, []);

  // 2. Real-Time Vision Inference Pipeline
  useEffect(() => {
    if (!active || !cameraReady) return;

    // High sensitivity thresholds
    const phoneThreshold = 0.08;
    const remoteThreshold = 0.10;
    const gadgetThreshold = 0.14;

    const runDetection = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || submittedRef.current) return;

      const videoW = video.videoWidth || 640;
      const videoH = video.videoHeight || 480;
      const boxesToDraw: DetectedBox[] = [];

      try {
        // Collect parallel detections from all available detectors
        const cocoPromise = cocoModelRef.current
          ? cocoModelRef.current.detect(video).catch(() => [])
          : Promise.resolve([]);

        const blazePromise = blazeModelRef.current
          ? blazeModelRef.current.estimateFaces(video, false).catch(() => [])
          : Promise.resolve([]);

        const nativePromise = nativeFaceDetectorRef.current
          ? nativeFaceDetectorRef.current.detect(video).catch(() => [])
          : Promise.resolve([]);

        const [cocoPreds, blazeFaces, nativeFaces] = await Promise.all([
          cocoPromise,
          blazePromise,
          nativePromise,
        ]);

        let detectedViol: ViolationState | null = null;

        // ---- CHECK 1: DIGITAL GADGETS & SMARTPHONES (COCO-SSD) ----
        // Watched prohibited classes
        const foundGadget = cocoPreds.find((p) => {
          const cls = p.class.toLowerCase();
          const isPhone = cls === "cell phone";
          const isRemote = cls === "remote"; // Handheld phones frequently classify as remote in COCO
          const isLaptop = cls === "laptop" || cls === "tv" || cls === "tablet";
          const isBookOrOther = cls === "book" || cls === "camera";

          if (isPhone && p.score >= phoneThreshold) return true;
          if (isRemote && p.score >= remoteThreshold) return true;
          if (isLaptop && p.score >= gadgetThreshold) return true;
          if (isBookOrOther && p.score >= 0.18) return true;
          return false;
        });

        if (foundGadget) {
          const cls = foundGadget.class.toLowerCase();
          const gadgetName = (cls === "cell phone" || cls === "remote")
            ? "Mobile Phone / Smartphone"
            : cls === "laptop"
            ? "Secondary Laptop / Screen"
            : cls === "tablet"
            ? "Tablet / Digital Device"
            : foundGadget.class;

          gadgetFramesRef.current += 1;
          if (gadgetFramesRef.current >= 1) {
            detectedViol = {
              type: "gadget",
              name: `Prohibited Device (${gadgetName})`,
              description: `A prohibited device (${gadgetName}) was detected in your camera view. Please remove all mobile phones and digital gadgets immediately.`,
            };
            setPreviewStatus("gadget");

            boxesToDraw.push({
              bbox: foundGadget.bbox,
              label: `🚫 ${gadgetName}`,
              isViolation: true,
            });
          }
        } else {
          gadgetFramesRef.current = 0;
        }

        // ---- CHECK 2: MULTIPLE PEOPLE IN CAMERA FRAME ----
        // We cross-verify via COCO-SSD persons + Native FaceDetector + BlazeFace
        const cocoPersons = cocoPreds.filter((p) => p.class === "person" && p.score >= 0.14);
        const personCountCoco = cocoPersons.length;
        const nativeFaceCount = nativeFaces.length;
        const blazeFaceCount = blazeFaces.length;

        const maxPersonsDetected = Math.max(personCountCoco, nativeFaceCount, blazeFaceCount);
        setPersonCount(Math.max(1, maxPersonsDetected));

        // Draw bounding boxes for persons
        cocoPersons.forEach((p, idx) => {
          const isCandidate = idx === 0 && maxPersonsDetected === 1;
          boxesToDraw.push({
            bbox: p.bbox,
            label: isCandidate ? "Candidate" : `Person ${idx + 1}`,
            isViolation: !isCandidate,
          });
        });

        if (!detectedViol && maxPersonsDetected > 1) {
          multiPersonFramesRef.current += 1;
          if (multiPersonFramesRef.current >= 1) {
            detectedViol = {
              type: "multiple_people",
              name: `Multiple People in Camera View (${maxPersonsDetected} people detected)`,
              description: "The examination must be taken strictly alone in a quiet room. Please ensure no other persons are in your camera view.",
            };
            setPreviewStatus("multi");
          }
        } else if (maxPersonsDetected <= 1) {
          multiPersonFramesRef.current = 0;
        }

        // ---- CHECK 3: CANDIDATE ABSENCE & HEAD POSE / GAZE DIRECTION ----
        if (!detectedViol) {
          const totalFaces = Math.max(blazeFaceCount, nativeFaceCount, personCountCoco);

          if (totalFaces === 0) {
            noFaceFramesRef.current += 1;
            if (noFaceFramesRef.current >= 3) {
              detectedViol = {
                type: "no_face",
                name: "Candidate Face Not Visible",
                description: "You must remain seated directly in front of the camera with your face clearly visible at all times.",
              };
              setPreviewStatus("noface");
            }
          } else {
            noFaceFramesRef.current = 0;

            // Analyze head pose / gaze direction via BlazeFace landmarks or Native FaceDetector landmarks
            let isLookingAway = false;
            let awayDirection = "";

            if (blazeFaces.length > 0) {
              const primaryFace = blazeFaces[0];
              const landmarks = primaryFace.landmarks as [number, number][];
              if (landmarks && landmarks.length >= 4) {
                const rightEye = landmarks[0];
                const leftEye = landmarks[1];
                const nose = landmarks[2];
                const mouth = landmarks[3];

                const eyeDist = Math.hypot(leftEye[0] - rightEye[0], leftEye[1] - rightEye[1]);
                if (eyeDist > 8) {
                  const midEyeX = (rightEye[0] + leftEye[0]) / 2;
                  const yawOffset = (nose[0] - midEyeX) / eyeDist;
                  const midEyeY = (rightEye[1] + leftEye[1]) / 2;
                  const eyeToMouth = Math.abs(mouth[1] - midEyeY);
                  const pitchRatio = (nose[1] - midEyeY) / Math.max(1, eyeToMouth);

                  if (yawOffset > 0.24) {
                    isLookingAway = true;
                    awayDirection = "Left";
                  } else if (yawOffset < -0.24) {
                    isLookingAway = true;
                    awayDirection = "Right";
                  } else if (pitchRatio > 0.80) {
                    isLookingAway = true;
                    awayDirection = "Down";
                  }
                }
              }
            } else if (nativeFaces.length > 0) {
              // Native FaceDetector fallback
              const face = nativeFaces[0];
              const landmarks = face.landmarks || [];
              const eyeLeft = landmarks.find((l: any) => l.type === "eye" && l.location?.x < face.boundingBox.x + face.boundingBox.width / 2);
              const eyeRight = landmarks.find((l: any) => l.type === "eye" && l.location?.x >= face.boundingBox.x + face.boundingBox.width / 2);
              const nose = landmarks.find((l: any) => l.type === "nose");

              if (eyeLeft && eyeRight && nose) {
                const eyeDist = Math.abs(eyeRight.location.x - eyeLeft.location.x);
                if (eyeDist > 8) {
                  const midEyeX = (eyeRight.location.x + eyeLeft.location.x) / 2;
                  const yaw = (nose.location.x - midEyeX) / eyeDist;
                  if (yaw > 0.24) {
                    isLookingAway = true;
                    awayDirection = "Left";
                  } else if (yaw < -0.24) {
                    isLookingAway = true;
                    awayDirection = "Right";
                  }
                }
              }
            }

            if (isLookingAway) {
              gazeAwayFramesRef.current += 1;
              if (gazeAwayFramesRef.current >= 2) {
                detectedViol = {
                  type: "gaze",
                  name: `Looking Away from Test Screen (${awayDirection})`,
                  description: "Your focus must remain strictly on the examination screen. Do not look away to the left, right, or down.",
                };
                setPreviewStatus("gaze");
              }
            } else {
              gazeAwayFramesRef.current = 0;
            }
          }
        }

        // Draw overlays onto the webcam canvas
        drawOverlayBoxes(boxesToDraw, videoW, videoH);

        // Apply detected violation or clear
        if (detectedViol) {
          const now = Date.now();
          if (now - lastSoundRef.current > 3500) {
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
      } catch (err) {
        // Safe frame drop handler
        console.warn("[WebcamProctor] Detection frame drop:", err);
      }
    };

    detectIntervalRef.current = setInterval(runDetection, cfg.detection_interval_ms || 400);
    return () => {
      if (detectIntervalRef.current) clearInterval(detectIntervalRef.current);
    };
  }, [active, cameraReady, onAutoSubmit, cfg.detection_interval_ms, cfg.second_offense_action, drawOverlayBoxes]);

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
      <div className="fixed bottom-4 left-4 z-[60] w-56 overflow-hidden rounded-2xl border-2 border-primary/50 bg-black/90 shadow-2xl backdrop-blur-md">
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
                  <Users className="h-3 w-3" /> {personCount} People
                </span>
              )}
              {previewStatus === "gadget" && (
                <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                  <Smartphone className="h-3 w-3" /> Gadget
                </span>
              )}
              {previewStatus === "noface" && (
                <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                  No Face
                </span>
              )}
            </span>
          )}
        </div>

        <div className="relative">
          <video ref={videoRef} muted playsInline className="h-36 w-full object-cover" />
          {/* Real-time bounding box canvas overlay */}
          <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none h-36 w-full object-cover" />

          {cameraError && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-3 text-center text-xs text-destructive">
              <VideoOff className="h-6 w-6 mb-1 text-destructive" />
              <p className="font-semibold text-[11px]">{cameraError}</p>
              <p className="text-[10px] text-zinc-400 mt-1">Camera permission is required.</p>
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
                <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-full bg-destructive text-white shadow-sm">
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
