import fs from "node:fs";
import path from "node:path";
import bidiFactory from "bidi-js";
import reshaperPkg from "arabic-persian-reshaper";

const { ArabicShaper } = reshaperPkg;
const bidi = bidiFactory();

// Covers the Arabic block plus its Supplement/Extended-A and the
// Presentation Forms A/B ranges (the shaped output below lands in the
// latter) — any of these means the standard PDF fonts used everywhere
// else in this doc (Helvetica/Helvetica-Bold, WinAnsi-encoded) can't
// render it and would fall back to mojibake.
const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

export function containsArabic(text) {
  return typeof text === "string" && ARABIC_RE.test(text);
}

// Noto Naskh Arabic (SIL OFL, see assets/fonts/OFL.txt) — has full
// Arabic + Arabic Presentation Forms A/B coverage plus enough Latin/
// digit/punctuation coverage to render an entire mixed-script line
// (e.g. "Best result: \"<arabic quote>\"") without switching fonts
// mid-line, which pdfkit's plain text() API doesn't support anyway.
// Shipped as the variable font (no static build exists upstream);
// pdfkit/fontkit embeds it at its default instance, which is Regular
// weight — fine here since none of this doc's Arabic-bearing strings
// need bold.
const ARABIC_FONT_NAME = "NotoNaskhArabic";
const ARABIC_FONT_PATH = path.join(process.cwd(), "assets", "fonts", "NotoNaskhArabic-Variable.ttf");

let arabicFontRegistered = false;
function ensureArabicFont(doc) {
  if (!arabicFontRegistered) {
    doc.registerFont(ARABIC_FONT_NAME, fs.readFileSync(ARABIC_FONT_PATH));
    arabicFontRegistered = true;
  }
  return ARABIC_FONT_NAME;
}

// Greedy word-wrap over a LOGICAL-order (pre-bidi-reorder) string. Line
// breaking has to run before bidi reordering — it must respect reading
// order, not the mirrored visual order a right-to-left line ends up in.
// Returns [{start, end}] character ranges (end exclusive) sized to
// maxWidth under the doc's already-set font/size.
function wrapLogicalRanges(doc, text, maxWidth) {
  const tokens = [];
  const re = /\S+|\s+/g;
  let m;
  while ((m = re.exec(text))) {
    tokens.push({ start: m.index, end: m.index + m[0].length, isSpace: /^\s/.test(m[0]) });
  }

  const lines = [];
  let curStart = null;
  let curEnd = null;
  for (const tok of tokens) {
    if (curStart === null) {
      if (tok.isSpace) continue; // never start a line on whitespace
      curStart = tok.start;
      curEnd = tok.end;
      continue;
    }
    const trial = text.slice(curStart, tok.end).replace(/\s+$/, "");
    if (doc.widthOfString(trial) > maxWidth) {
      lines.push({ start: curStart, end: curEnd });
      curStart = tok.isSpace ? null : tok.start;
      curEnd = tok.isSpace ? null : tok.end;
    } else {
      curEnd = tok.end;
    }
  }
  if (curStart !== null) lines.push({ start: curStart, end: curEnd });
  return lines.length > 0 ? lines : [{ start: 0, end: text.length }];
}

// Measures `text` for pagination, matching drawParagraph's existing
// "measure the real height first, then draw" pattern (a fixed guess
// previously let ensureSpace start content too close to the footer —
// see buildReportPdf.js's own comment on that). For plain Latin text
// this is just doc.heightOfString(); for anything containing Arabic it
// shapes (joins) the letters via ArabicShaper — which must run on the
// original logical-order string, since joining forms are computed from
// real logical neighbors — then wraps and bidi-reorders per line via
// bidi-js, matching pdfkit's own font/width. Reordering the WHOLE
// paragraph before wrapping (instead of per line) would let a
// multi-line right-to-left paragraph's lines come out in the wrong
// order once mirrored, so line-break points are always found first, in
// logical order.
export function measureParagraph(doc, text, { font, size, width, lineGap = 3 }) {
  if (!containsArabic(text)) {
    doc.font(font).fontSize(size);
    return { arabic: false, height: doc.heightOfString(text, { width, lineGap }) };
  }

  const arabicFont = ensureArabicFont(doc);
  doc.font(arabicFont).fontSize(size);
  const shaped = ArabicShaper.convertArabic(text);
  const levels = bidi.getEmbeddingLevels(shaped);
  const rtl = (levels.paragraphs[0]?.level ?? 0) % 2 === 1;
  const ranges = wrapLogicalRanges(doc, shaped, width);
  const lineHeight = doc.currentLineHeight() + lineGap;
  const lines = ranges
    .map(({ start, end }) => {
      if (end <= start) return "";
      return bidi.getReorderedString(shaped, levels, start, end - 1).slice(start, end).trim();
    })
    .filter(Boolean);

  return {
    arabic: true,
    rtl,
    lines,
    lineHeight,
    height: Math.max(lines.length, 1) * lineHeight,
    font: arabicFont,
    size,
  };
}

// Draws a paragraph already measured by measureParagraph. A right-to-
// left paragraph (Arabic-dominant, base direction resolved by bidi-js
// from its first strong character) right-aligns each line within
// `width`; a mixed paragraph whose base direction is still left-to-
// right (e.g. an English sentence quoting an Arabic phrase) keeps the
// normal left alignment, same as every other paragraph in this PDF.
export function paintParagraph(doc, measured, text, x, y, { color, width, font, size, lineGap = 3 } = {}) {
  if (!measured.arabic) {
    doc.font(font).fontSize(size).fillColor(color).text(text, x, y, { width, lineGap });
    return doc.y;
  }

  doc.font(measured.font).fontSize(measured.size).fillColor(color);
  let cy = y;
  measured.lines.forEach((line) => {
    const lineWidth = doc.widthOfString(line);
    const lx = measured.rtl ? x + Math.max(0, width - lineWidth) : x;
    doc.text(line, lx, cy, { lineBreak: false });
    cy += measured.lineHeight;
  });
  return cy;
}
