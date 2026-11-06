// Public site URL, used for the canonical link, social-card URLs, robots.txt and sitemap.xml.
// Set SITE_URL in production. Vercel supplies its production domain as a fallback.
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const SITE_URL = (
  process.env.SITE_URL || (vercelHost ? `https://${vercelHost}` : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_NAME = "UltraTech Engineer";
export const SITE_TITLE = "UltraTech Engineer — Home-Building Voice Assistant";
export const SITE_DESCRIPTION =
  "Ask the UltraTech Engineer about building your home. Get clear, confident answers by voice or chat in English, हिंदी or Hinglish, at every stage.";
