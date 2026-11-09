# Changelog

Newest first. Started 2026-11-09; earlier history is in `git log`.

## 2026-11-09 — Language screen on every load

- **Added** a full-screen language picker (`LanguageScreen.tsx`) as the first thing shown on every
  page load, for new and returning users. The last-used language is highlighted, but a tap is
  always required.
- **Changed** onboarding from name → language → stage to language → name → stage.
- **Changed** the header menu: *Change language* stays hidden until a name is known.
- **Removed** the *More* option and its "Tamil, Telugu, Kannada and Malayalam are coming soon"
  message, from both the picker and the in-chat language options.

See [01-onboarding.md](01-onboarding.md).
