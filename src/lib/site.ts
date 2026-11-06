// Public site URL, resolved and fixed into the build by next.config.ts.
export const SITE_URL = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const SITE_NAME = "UltraTech Engineer";
export const SITE_TITLE = "UltraTech Engineer — Home-Building Voice Assistant";
export const SITE_DESCRIPTION =
  "Ask the UltraTech Engineer about building your home. Get clear, confident answers by voice or chat in English, हिंदी or Hinglish, at every stage.";
