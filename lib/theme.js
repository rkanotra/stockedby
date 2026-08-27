// The Ink dark-theme palette (CLAUDE.md hard rule 5) — single source of
// truth for the two surfaces that can't use CSS custom properties:
// lib/pdf/buildReportPdf.js (pdfkit, no CSS at all) and lib/email.js's
// inline-styled HTML (custom properties are unreliable across email
// clients). React components use the same values via the CSS custom
// properties defined in app/globals.css's :root instead — see
// components/test/test.module.css for that side.
//
// Replaces the old pine palette (#0E1F18 and its derived greens). Green is
// deliberately not part of this palette at all — it was the old verdict
// "good" colour and is retired everywhere, not just in the report's
// headline treatment (CLAUDE.md hard rule 5's verdict-colour rules).
export const INK = {
  bgBase: "#14171E",
  bgSurface: "#181C25",
  bgInset: "#11141A",
  borderSubtle: "#262B36",
  borderStrong: "#2C3240",
  textPrimary: "#F4F4F6",
  textSecondary: "#DDE1E9",
  textMuted: "#B7BCC8",
  textMono: "#8B93A5",
  accent: "#F5B840",
  accentHover: "#FFD070",
  onAccent: "#181C25",
  // Not part of the original token list — genuine form/request errors
  // (invalid email, rate limit hit) are a different category from "verdict
  // colour" and still need a red. Reuses the audit's one sanctioned red so
  // the app has exactly one red hue, not two.
  danger: "#FF8A80",
};
