"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useApp } from "@/lib/store";
import { Icon } from "../ui/Icon";

type Facing = "environment" | "user";
type CamState = "starting" | "ready" | "unavailable";

const MAX_EDGE = 1280;

/** Downscale an image source into a JPEG data URL (keeps transcript + uploads light). */
function toDataUrl(source: CanvasImageSource, w: number, h: number): string {
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

/** 04a · Camera — live viewfinder, focus reticle, tips, shutter, flash and camera switch. */
export function CameraScreen() {
  const { closeCamera, capturePhoto, state } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [facing, setFacing] = useState<Facing>("environment");
  const [cam, setCam] = useState<CamState>("starting");
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [flash, setFlash] = useState(0);
  const lastPhoto = state.messages.findLast((m) => m.kind === "user" && m.photo);

  useEffect(() => {
    let cancelled = false;
    async function open() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCam("unavailable");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
        setTorchSupported(!!caps?.torch);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCam("ready");
      } catch {
        if (!cancelled) setCam("unavailable");
      }
    }
    void open();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facing]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !torchSupported) return;
    const next = !torch;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorch(next);
    } catch {
      setTorchSupported(false);
    }
  }, [torch, torchSupported]);

  function shoot() {
    const video = videoRef.current;
    if (cam !== "ready" || !video?.videoWidth) {
      fileRef.current?.click();
      return;
    }
    setFlash((f) => f + 1);
    const photo = toDataUrl(video, video.videoWidth, video.videoHeight);
    window.setTimeout(() => capturePhoto(photo), 220);
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      capturePhoto(toDataUrl(img, img.naturalWidth, img.naturalHeight));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface-deep">
      <div className="mt-[max(12px,env(safe-area-inset-top))] flex shrink-0 items-center justify-between gap-2 px-4">
        <button
          type="button"
          onClick={closeCamera}
          aria-label="Close camera"
          className="glass-chip grid size-11 place-items-center rounded-[22px]"
        >
          <Icon src="/camera/x.svg" size={22} />
        </button>
        <h2 className="glass-chip truncate rounded-[22px] px-4 py-3 text-[15px] leading-[18px] font-[590] text-white/95">
          Take a photo of the crack
        </h2>
        <button
          type="button"
          onClick={toggleTorch}
          disabled={!torchSupported}
          aria-label={torch ? "Turn flash off" : "Turn flash on"}
          aria-pressed={torch}
          className={`glass-chip grid size-11 place-items-center rounded-[22px] transition-colors disabled:opacity-40 ${torch ? "bg-brand/40" : ""}`}
        >
          <Icon src="/camera/zap.svg" size={20} />
        </button>
      </div>

      <div className="relative mx-3 mt-4 min-h-0 flex-1 overflow-hidden rounded-[28px] bg-viewfinder">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 size-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`}
        />
        {cam !== "ready" && (
          <div className="absolute inset-0 grid place-items-center p-8 text-center">
            {cam === "starting" ? (
              <p className="text-[14px] text-white/70">Opening camera…</p>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <p className="text-[15px] leading-[21px] text-white/85">
                  Camera isn&apos;t available here. You can upload a photo from your gallery instead.
                </p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="rounded-full bg-brand px-4 py-2.5 text-[14px] font-[590] text-ink"
                >
                  Choose a photo
                </button>
              </div>
            )}
          </div>
        )}
        {/* Focus reticle, centred in the viewfinder. */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Image src="/camera/reticle.svg" alt="" width={190} height={190} unoptimized />
        </div>
        <AnimatePresence>
          {flash > 0 && (
            <motion.div
              key={flash}
              className="absolute inset-0 bg-white"
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 flex shrink-0 justify-center gap-2">
        {["Close to the crack", "In good light"].map((tip) => (
          <span
            key={tip}
            className="rounded-[18px] border border-white/20 bg-white/10 px-3.5 py-2 text-[13px] font-[510] text-white/90"
          >
            {tip}
          </span>
        ))}
      </div>
      <p className="mx-auto mt-3 max-w-[313px] shrink-0 text-center text-[13px] text-white/70">
        Keep the whole crack in frame — a clear photo gets you better advice.
      </p>

      <div className="mx-auto mt-3 grid w-full max-w-[393px] shrink-0 grid-cols-[1fr_auto_1fr] items-center px-11 pb-[max(30px,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Choose a photo from the gallery"
          className="relative size-14 justify-self-start overflow-hidden rounded-2xl border-2 border-brand bg-viewfinder"
        >
          {lastPhoto?.kind === "user" && lastPhoto.photo ? (
            <Image src={lastPhoto.photo} alt="" fill unoptimized className="object-cover" />
          ) : (
            <span className="grid size-full place-items-center text-[22px] leading-none text-white/80">+</span>
          )}
        </button>
        <motion.button
          type="button"
          onClick={shoot}
          aria-label="Take photo"
          whileTap={{ scale: 0.9 }}
          className="size-[104px]"
        >
          <Image src="/camera/shutter.svg" alt="" width={104} height={104} unoptimized />
        </motion.button>
        <button
          type="button"
          onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
          aria-label="Switch camera"
          className="glass-chip grid size-14 place-items-center justify-self-end rounded-[28px]"
        >
          <Icon src="/camera/refresh.svg" size={24} />
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </div>
  );
}
