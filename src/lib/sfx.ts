/**
 * Tiny UI sounds, synthesized with Web Audio: no audio files, nothing on first paint (Lighthouse).
 *
 *  - "receive"  soft two-note pop when the expert's message appears
 *  - "select"   short tick when a chip / option is tapped
 *  - "send"     light upward swish when the user sends something
 *
 * Browsers only allow audio after a user gesture, so nothing plays until the first tap/key
 * (`initSfx` unlocks it then). Muted when the tab is hidden, and via the menu ("Sound off",
 * stored in localStorage). Every call is fire-and-forget and never throws.
 */

export type Sfx = "receive" | "select" | "send";

const KEY = "ultratech.sound";
let ctx: AudioContext | null = null;
let unlocked = false;

export function soundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* storage blocked: stays on for this visit */
  }
}

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

/** Call once on the client: the first tap or key press unlocks audio (iOS needs it inside the gesture). */
export function initSfx() {
  if (typeof window === "undefined" || unlocked) return;
  const unlock = () => {
    unlocked = true;
    context();
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
}

function tone(c: AudioContext, at: number, o: { freq: number; to?: number; type?: OscillatorType; dur: number; gain: number }) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, at);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, at + o.dur);
  // Quick attack, smooth exponential release: no clicks.
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(o.gain, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + o.dur);
  osc.connect(g).connect(c.destination);
  osc.start(at);
  osc.stop(at + o.dur + 0.02);
}

export function playSfx(kind: Sfx) {
  if (!unlocked || typeof document === "undefined" || document.hidden || !soundOn()) return;
  const c = context();
  if (!c) return;
  try {
    const t = c.currentTime + 0.01;
    if (kind === "receive") {
      tone(c, t, { freq: 740, dur: 0.11, gain: 0.05 });
      tone(c, t + 0.07, { freq: 1110, dur: 0.16, gain: 0.045 });
    } else if (kind === "select") {
      tone(c, t, { freq: 1500, type: "triangle", dur: 0.04, gain: 0.035 });
    } else {
      tone(c, t, { freq: 520, to: 980, dur: 0.13, gain: 0.035 });
    }
  } catch {
    /* audio is decoration only */
  }
}
