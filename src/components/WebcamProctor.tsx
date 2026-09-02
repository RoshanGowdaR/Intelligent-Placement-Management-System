import { useEffect, useRef, useState } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, Video, VideoOff } from "lucide-react";
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
  warning_delay_seconds: 5,
  second_offense_action: "submit",
  detection_interval_ms: 1500,
  confidence_threshold: 0.55,
  consecutive_frames: 1,
  watched_classes: DEFAULT_GADGET_CLASSES,
};

export default function WebcamProctor({ active, onAutoSubmit, onEvent, config }: WebcamProctorProps) {
  const cfg: ProctorConfig = { ...DEFAULT_CONFIG, ...(config || {}) };
  const graceSeconds = cfg.warning_delay_seconds;

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const detectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedRef = useRef(false);
  const warnedOnceRef = useRef(false);
  const consecutiveHitsRef = useRef(0);
  const onEventRef = useRef(onEvent);
  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectedGadget, setDetectedGadget] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(graceSeconds);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: "user" },
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
        const model = await cocoSsd.load();
        if (cancelled) return;
        modelRef.current = model;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unable to access webcam";
        setCameraError(msg);
        toast.error("Webcam required: " + msg);
      }
    })();

    return () => {
      cancelled = true;
      if (detectIntervalRef.current) clearInterval(detectIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      modelRef.current = null;
    };
  }, [active]);

  const detectedGadgetRef = useRef<string | null>(null);
  useEffect(() => { detectedGadgetRef.current = detectedGadget; }, [detectedGadget]);

  useEffect(() => {
    if (!active || !cameraReady) return;

    const watchedSet = new Set((cfg.watched_classes && cfg.watched_classes.length ? cfg.watched_classes : DEFAULT_GADGET_CLASSES));
    const threshold = Math.min(0.95, Math.max(0.1, cfg.confidence_threshold ?? 0.55));
    const requiredHits = Math.max(1, Math.min(10, cfg.consecutive_frames ?? 1));

    const runDetection = async () => {
      if (!modelRef.current || !videoRef.current || videoRef.current.readyState < 2) return;
      if (submittedRef.current) return;
      try {
        const preds = await modelRef.current.detect(videoRef.current);
        const gadget = preds.find((p) => p.score > threshold && watchedSet.has(p.class));
        if (gadget) {
          consecutiveHitsRef.current += 1;
          if (consecutiveHitsRef.current < requiredHits) return;
          if (warnedOnceRef.current && !detectedGadgetRef.current) {
            if (cfg.second_offense_action === "submit" && !submittedRef.current) {
              submittedRef.current = true;
              onEventRef.current?.({ timestamp: new Date().toISOString(), gadget: gadget.class, action: "auto_submit" });
              toast.error(`🚫 Gadget detected again (${gadget.class}). Auto-submitting your test.`);
              onAutoSubmit();
            } else {
              setDetectedGadget((curr) => curr ?? gadget.class);
            }
            return;
          }
          setDetectedGadget((curr) => curr ?? gadget.class);
        } else {
          consecutiveHitsRef.current = 0;
          setDetectedGadget(null);
        }
      } catch { /* ignore */ }
    };

    detectIntervalRef.current = setInterval(runDetection, cfg.detection_interval_ms);
    return () => { if (detectIntervalRef.current) clearInterval(detectIntervalRef.current); };
  }, [active, cameraReady, onAutoSubmit, cfg.detection_interval_ms, cfg.second_offense_action]);

  useEffect(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (!detectedGadget) {
      setCountdown(graceSeconds);
      return;
    }
    warnedOnceRef.current = true;
    onEventRef.current?.({ timestamp: new Date().toISOString(), gadget: detectedGadget, action: "warning" });
    toast.warning(`⚠️ Digital gadget detected (${detectedGadget}). Remove it within ${graceSeconds} seconds.`);
    setCountdown(graceSeconds);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          if (!submittedRef.current) {
            submittedRef.current = true;
            onEventRef.current?.({ timestamp: new Date().toISOString(), gadget: detectedGadget, action: "auto_submit" });
            toast.error("🚫 Gadget not removed in time. Auto-submitting your test.");
            onAutoSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current); };
  }, [detectedGadget, onAutoSubmit, graceSeconds]);

  if (!active) return null;

  return (
    <>
      {/* Floating webcam preview (bottom-left so it doesn't overlap nav buttons) */}
      <div className="fixed bottom-4 left-4 z-[60] w-48 overflow-hidden rounded-lg border-2 border-primary/40 bg-black shadow-lg">
        <div className="flex items-center justify-between bg-background/80 px-2 py-1 text-xs">
          <span className="flex items-center gap-1 font-medium">
            {cameraReady ? <Video className="h-3 w-3 text-green-500" /> : <VideoOff className="h-3 w-3 text-destructive" />}
            Proctor
          </span>
          {cameraReady && <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />}
        </div>
        <video ref={videoRef} muted playsInline className="h-32 w-full object-cover" />
        {cameraError && (
          <div className="bg-destructive/10 p-2 text-[10px] text-destructive">{cameraError}</div>
        )}
      </div>

      {detectedGadget && (
        <div className="fixed left-1/2 top-4 z-[60] w-full max-w-xl -translate-x-1/2 px-4">
          <Alert variant="destructive" className="border-2 shadow-2xl">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Digital Gadget Detected: {detectedGadget}</AlertTitle>
            <AlertDescription>
              Please remove the gadget from view within <strong>{countdown}s</strong> or your test will be auto-submitted.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </>
  );
}
