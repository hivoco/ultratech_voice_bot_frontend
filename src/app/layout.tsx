import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "UltraTech Engineer — Home-building voice assistant",
  description:
    "Talk to the UltraTech Engineer in English, हिंदी or Hinglish for clear, confident answers at every stage of building your home.",
  applicationName: "UltraTech Engineer",
};

export const viewport: Viewport = {
  themeColor: "#2a2218",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${devanagari.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
