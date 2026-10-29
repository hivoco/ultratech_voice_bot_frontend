import Image from "next/image";

/** Decorative SVG from /public (exported from Figma). Sized by its slot, never stretched. */
export function Icon({ src, size, className }: { src: string; size: number; className?: string }) {
  return <Image src={src} alt="" aria-hidden width={size} height={size} unoptimized className={className} />;
}
