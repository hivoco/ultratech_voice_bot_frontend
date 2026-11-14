import type { ExpertContact } from "./types";

/**
 * How the user can reach a human expert, from the backend (`contact` on a serious `/turn` or
 * `/turn/image` reply, the `escalation` / `expert` call topics). Untrusted JSON in; each channel
 * is kept only if it's well-formed, so the card never shows a button that can't work.
 * Contract: docs/backend-fixes.md item 9.
 */
export type ContactChannels = Pick<ExpertContact, "phone" | "whatsapp" | "email" | "bookingUrl" | "callSlot">;

const PHONE_RE = /^\+?[0-9 -]{6,20}$/;
// Local part limited to plain characters: no "?", "&" or "#", which would let a backend value
// smuggle extra mailto: fields (a hidden bcc, a prefilled body).
const EMAIL_RE = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$/;

function str(v: unknown, max: number): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
}

function httpsUrl(v: unknown): string | undefined {
  const s = str(v, 2000);
  if (!s) return undefined;
  try {
    return new URL(s).protocol === "https:" ? s : undefined;
  } catch {
    return undefined;
  }
}

export function parseContact(v: unknown): ContactChannels & { name?: string; role?: string } {
  if (!v || typeof v !== "object") return {};
  const c = v as Record<string, unknown>;
  const phone = str(c.phone, 20);
  const whatsapp = str(c.whatsapp, 20);
  const email = str(c.email, 254);
  return {
    name: str(c.name, 80),
    role: str(c.role, 200),
    callSlot: str(c.callSlot ?? c.call_slot, 120),
    phone: phone && PHONE_RE.test(phone) ? phone : undefined,
    whatsapp: whatsapp && PHONE_RE.test(whatsapp) ? whatsapp : undefined,
    email: email && EMAIL_RE.test(email) ? email : undefined,
    bookingUrl: httpsUrl(c.booking_url ?? c.bookingUrl),
  };
}

/** wa.me wants digits only, country code included. */
export function whatsappLink(number: string): string {
  return `https://wa.me/${number.replace(/[^0-9]/g, "")}`;
}

export function hasChannel(c: ContactChannels): boolean {
  return !!(c.phone || c.whatsapp || c.email || c.bookingUrl);
}
