import { PDFDocument, registerStdFonts } from "pdfkit";
import Helvetica from "pdfkit/standard-fonts/Helvetica";
import HelveticaBold from "pdfkit/standard-fonts/HelveticaBold";
import { ENGINE_ORDER, ENGINE_LABELS, MARKET_LABELS, RIVAL_LABELS, DEST_LABELS, matches, categoryMidSentence } from "../scoring";
import { buildAppearanceStory, buildTopBrands, buildDestinationStory, buildFixPlan } from "../layerOne";
import { INK } from "../theme";

// Next's bundler resolves pdfkit's ESM `import` to its browser build (the
// package only declares a "node" export condition for `require`, not
// `import` — see node_modules/pdfkit/package.json), which needs its
// standard fonts registered explicitly before use. Registering is a no-op
// if a build ever doesn't need it, so this is safe either way.
let stdFontsRegistered = false;
function ensureStdFonts() {
  if (stdFontsRegistered) return;
  registerStdFonts(Helvetica, HelveticaBold);
  stdFontsRegistered = true;
}

// Dark theme, matching the app/report screens (hard rule 5) — this PDF is
// the artifact people forward internally, so it should look like the
// report it came from, not the marketing site. Standard PDF fonts
// (Helvetica/Helvetica-Bold) stand in for Bricolage Grotesque/Archivo/IBM
// Plex Mono — embedding those webfonts would add a fetch dependency and
// risk the ~300KB size target for no real gain in a document this
// text-heavy.
// Ink palette (lib/theme.js) — single source of truth shared with
// lib/email.js and the CSS custom properties in app/globals.css. GOOD/BAD
// are deliberately gone: green is retired as a colour entirely (not just
// as a verdict colour), and the old verdict red only survives as a
// per-context choice at each call site below, not a reusable constant —
// see the destColors/segments comments further down.
const PINE = INK.bgBase;
const CARD = INK.bgSurface;
const TEXT = INK.textPrimary;
const YELLOW = INK.accent;
const SECONDARY = INK.textSecondary;
const LINE = INK.borderSubtle;

const PAGE_MARGIN = 50;
const FOOTER_HEIGHT = 30;

function docToBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function contentWidth(doc) {
  return doc.page.width - PAGE_MARGIN * 2;
}

function pageBottom(doc) {
  return doc.page.height - PAGE_MARGIN - FOOTER_HEIGHT;
}

// StockedBy wordmark top-left + a light, low-opacity diagonal watermark —
// drawn on every page (background fill included) so a screenshotted page,
// forwarded on its own, still traces back to StockedBy. No image asset is
// embedded (none exists in this codebase) — same text-wordmark approach
// components/Nav.js's logo uses, just in PDF form.
function paintPage(doc) {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(PINE);

  doc.save();
  doc.opacity(0.05);
  doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(64);
  doc.rotate(-35, { origin: [doc.page.width / 2, doc.page.height / 2] });
  doc.text("STOCKEDBY.COM", -100, doc.page.height / 2 - 30, {
    width: doc.page.width + 200,
    align: "center",
  });
  doc.restore();
  doc.opacity(1);

  doc.font("Helvetica-Bold").fontSize(13).fillColor(TEXT).text("StockedBy", PAGE_MARGIN, PAGE_MARGIN - 20);
  doc.rect(PAGE_MARGIN + 62, PAGE_MARGIN - 18, 3, 12).fill(YELLOW);
}

function newPage(doc) {
  doc.addPage();
  paintPage(doc);
  return PAGE_MARGIN + 10;
}

// The one pagination primitive everything below uses: if the next block
// wouldn't fit above the footer, start a fresh (painted) page first.
function ensureSpace(doc, y, needed) {
  if (y + needed > pageBottom(doc)) return newPage(doc);
  return y;
}

function drawCover(doc, { brand, categoryName, marketLabel, dateStr }) {
  let y = PAGE_MARGIN + 60;
  doc.font("Helvetica-Bold").fontSize(26).fillColor(TEXT).text("AI Visibility Report", PAGE_MARGIN, y, {
    width: contentWidth(doc),
  });
  y = doc.y + 10;
  doc
    .font("Helvetica")
    .fontSize(12)
    .fillColor(SECONDARY)
    .text([brand, categoryName, marketLabel, dateStr].filter(Boolean).join("  ·  "), PAGE_MARGIN, y, {
      width: contentWidth(doc),
    });
  y = doc.y + 16;
  doc.rect(PAGE_MARGIN, y, contentWidth(doc), 2).fill(YELLOW);
  return y + 24;
}

function drawSectionTitle(doc, text, y) {
  y = ensureSpace(doc, y, 30);
  doc.font("Helvetica-Bold").fontSize(14).fillColor(TEXT).text(text, PAGE_MARGIN, y);
  return y + doc.heightOfString(text, { width: contentWidth(doc) }) + 8;
}

function drawParagraph(doc, text, y, opts = {}) {
  const size = opts.size || 10.5;
  doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(size);
  // Measure the REAL wrapped height first — a fixed guess here previously
  // underestimated a multi-line paragraph, so ensureSpace let it start too
  // close to the footer and pdfkit's own auto-pagination kicked in
  // mid-paragraph (an unpainted, unfooted extra page — the actual cause
  // of a 9-page output for what should have been ~3-4 pages).
  const realHeight = doc.heightOfString(text, { width: contentWidth(doc), lineGap: 3 });
  y = ensureSpace(doc, y, realHeight);
  doc.fillColor(opts.color || TEXT);
  doc.text(text, PAGE_MARGIN, y, { width: contentWidth(doc), lineGap: 3 });
  return doc.y + (opts.gap ?? 12);
}

// Fixed-row-height table with its own pagination: bounded lists (leaders,
// per-engine checks, destinations, sources) never run more than ~8 rows,
// so a fixed row height stays readable; if a table would cross the
// footer, it starts on a fresh page rather than splitting a row across
// two pages.
function drawTable(doc, { y, colWidths, header, rows, rowHeight = 22 }) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  y = ensureSpace(doc, y, rowHeight * (rows.length + 1) + 10);
  let cy = y;

  doc.rect(PAGE_MARGIN, cy, totalWidth, rowHeight).fill(YELLOW);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(PINE);
  let cx = PAGE_MARGIN;
  header.forEach((h, i) => {
    doc.text(h, cx + 8, cy + 7, { width: colWidths[i] - 12, lineBreak: false, ellipsis: true });
    cx += colWidths[i];
  });
  cy += rowHeight;

  doc.font("Helvetica").fontSize(9.5);
  rows.forEach((row, ri) => {
    doc.rect(PAGE_MARGIN, cy, totalWidth, rowHeight).fill(ri % 2 === 1 ? CARD : PINE);
    doc.fillColor(TEXT);
    cx = PAGE_MARGIN;
    row.forEach((cell, i) => {
      doc.text(String(cell), cx + 8, cy + 7, { width: colWidths[i] - 12, lineBreak: false, ellipsis: true });
      cx += colWidths[i];
    });
    cy += rowHeight;
  });

  doc.rect(PAGE_MARGIN, y, totalWidth, cy - y).strokeColor(LINE).lineWidth(0.75).stroke();
  return cy + 16;
}

// A simple horizontal stacked bar, same shape as the web report's .sov —
// real page structure (per spec), not just a data dump.
function drawStackedBar(doc, y, segments) {
  const width = contentWidth(doc);
  const height = 14;
  y = ensureSpace(doc, y, height + 10);
  let cx = PAGE_MARGIN;
  segments.forEach(({ pct, color }) => {
    const w = (Math.max(0, pct) / 100) * width;
    if (w > 0) doc.rect(cx, y, w, height).fill(color);
    cx += w;
  });
  doc.rect(PAGE_MARGIN, y, width, height).strokeColor(LINE).lineWidth(0.75).stroke();
  return y + height + 10;
}

function drawLegendRow(doc, y, label, value, color) {
  y = ensureSpace(doc, y, 18);
  doc.rect(PAGE_MARGIN, y + 3, 8, 8).fill(color);
  doc.font("Helvetica").fontSize(9.5).fillColor(TEXT).text(label, PAGE_MARGIN + 14, y, { continued: false });
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(TEXT).text(value, doc.page.width - PAGE_MARGIN - 60, y, {
    width: 60,
    align: "right",
  });
  return y + 16;
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

// Per-engine presence — same "did this AI app ever mention the brand"
// check the rest of the report is built from, just surfaced per engine
// instead of summed across all three.
function engineAppearance(engines, brand) {
  return ENGINE_ORDER.map((engine) => {
    const rows = engines?.[engine] || [];
    const appeared = rows.some((row) =>
      (row.recs || []).some((rec) => matches(brand, rec?.brand) || matches(brand, rec?.product))
    );
    return { engine, appeared };
  });
}

// Every field reads only from what's actually true this test — never a
// fabricated paragraph (hard rule 2). A section with no underlying data
// is skipped entirely, never printed with an empty table.
export async function buildReportPdf({
  brand,
  categoryName,
  market,
  competitor,
  brandWebsite,
  report,
  engines,
  sentiment,
  mentionCount,
  trustedSources,
  reportUrl,
  generatedAt,
}) {
  const marketLabel = MARKET_LABELS[market] || market || "";
  const rivalLabel = RIVAL_LABELS[market] || "Amazon";
  const dateStr = new Date(generatedAt || Date.now()).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const appearance = buildAppearanceStory(report?.appearanceSummary);
  const brandsFull = buildTopBrands(engines, brand, 5);
  const destStory = buildDestinationStory(report?.destinations?.yourDestinations);
  const fixPlan = buildFixPlan({
    appearanceSummary: report?.appearanceSummary,
    yourDestinations: report?.destinations?.yourDestinations,
    trustedSources,
    sentiment,
    brandWebsite,
  });
  const perEngine = engineAppearance(engines, brand);
  const bestRank = report?.appearanceSummary?.bestRank || null;
  const sov = report?.shareOfVoice || null;
  const dest = report?.destinations || null;

  ensureStdFonts();
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN, right: PAGE_MARGIN },
    bufferPages: true,
    info: { Title: `${brand} — AI Visibility Report — StockedBy`, Author: "StockedBy" },
  });
  paintPage(doc);

  // ---------- Cover + executive summary ----------
  let y = drawCover(doc, { brand, categoryName, marketLabel, dateStr });

  const destTotal = destStory.yours + destStory.others;
  const commissionLine =
    destTotal === 0
      ? ""
      : destStory.others > destStory.yours && destStory.topOtherDomain
      ? ` When AI recommends brands in this category, buyers are sent to ${destStory.topOtherDomain} — a sale that pays that shop's commission, not yours.`
      : destStory.yours > 0
      ? " When AI recommends brands in this category, buyers are mostly sent straight to the brand's own site."
      : "";

  const summaryParagraph =
    `We asked ChatGPT, Gemini and Claude the questions real shoppers ask about ${categoryName ? categoryMidSentence(categoryName) : "this category"} in ${marketLabel}. ` +
    `${brand} appeared in ${appearance.appearedIn} of ${appearance.totalAttempted} answers.` +
    commissionLine;

  y = drawSectionTitle(doc, "Executive summary", y);
  y = drawParagraph(doc, summaryParagraph, y, { gap: 18 });

  const verdictRows = [
    ["AI appearance", `${appearance.appearedIn} of ${appearance.totalAttempted} questions`],
    ...(bestRank ? [["Best position", `#${bestRank} when recommended`]] : []),
    ...perEngine.map(({ engine, appeared }) => [ENGINE_LABELS[engine], appeared ? "Mentions you" : "Does not mention you"]),
  ];
  y = drawTable(doc, {
    y,
    colWidths: [contentWidth(doc) * 0.45, contentWidth(doc) * 0.55],
    header: ["What we checked", "What we found"],
    rows: verdictRows,
  });

  // ---------- Who AI recommends today ----------
  if (brandsFull.top.length > 0) {
    y = drawSectionTitle(doc, "Who AI recommends today", y);
    y = drawTable(doc, {
      y,
      colWidths: [contentWidth(doc) * 0.15, contentWidth(doc) * 0.6, contentWidth(doc) * 0.25],
      header: ["Rank", "Brand", "Mentions"],
      rows: brandsFull.top.map((b, i) => [
        ordinal(i + 1),
        matches(brand, b.label) ? `${b.label} (you)` : b.label,
        String(b.count),
      ]),
    });
    const leader = brandsFull.top[0];
    const leaderLine = brandsFull.brandInTop
      ? `${leader.label} leads the category, and ${brand} is on this list.`
      : `${leader.label} leads the category — ${brand} does not appear in the top ${brandsFull.top.length} brands AI recommends.`;
    y = drawParagraph(doc, leaderLine, y, { size: 9.5, color: SECONDARY, gap: 20 });
  }

  // ---------- The checkout battle (full destination breakdown) ----------
  const checkoutTotal = dest ? Object.values(dest.tally || {}).reduce((a, b) => a + b, 0) : 0;
  if (checkoutTotal > 0) {
    y = drawSectionTitle(doc, "The checkout battle — where AI sends buyers to pay", y);
    // Same treatment as components/test/report/CheckoutBattleCard.js's
    // DEST_COLORS (hard rule 5): neutral for brand-direct, the one accent
    // for marketplace, aggregator keeps its own distinct comparison-blue.
    const destColors = { "brand-direct": SECONDARY, marketplace: YELLOW, aggregator: "#4a9fd8", none: INK.borderStrong };
    y = drawStackedBar(
      doc,
      y,
      Object.keys(destColors).map((k) => ({ pct: dest.pct?.[k] || 0, color: destColors[k] }))
    );
    Object.keys(destColors).forEach((k) => {
      y = drawLegendRow(doc, y, DEST_LABELS[k], `${dest.pct?.[k] || 0}%`, destColors[k]);
    });
    if ((dest.yourDestinations || []).length > 0) {
      y += 6;
      y = drawTable(doc, {
        y,
        colWidths: [contentWidth(doc) * 0.55, contentWidth(doc) * 0.25, contentWidth(doc) * 0.2],
        header: [`When AI recommends ${brand}, buyers go to`, "Type", "Times"],
        rows: dest.yourDestinations.map((d) => [d.domain, DEST_LABELS[d.destination] || d.destination, `${d.count}×`]),
      });
    }
    y += 6;
  }

  // ---------- How often AI picks each brand ----------
  if (sov && sov.slotTotal > 0) {
    y = drawSectionTitle(doc, "How often AI picks each brand", y);
    y = drawParagraph(
      doc,
      "Of every recommendation slot AI handed out across these questions, how many went to you versus the competition.",
      y,
      { size: 9.5, color: SECONDARY, gap: 8 }
    );
    const hasComp = sov.competitor !== null && competitor;
    // Same treatment as components/test/report/ShareOfVoiceCard.js: "you"
    // is the one accent segment, competitor keeps its own comparison-blue,
    // rival/other are neutral (losing a slot isn't a pass/fail).
    const segments = [
      { pct: sov.you, color: YELLOW },
      ...(hasComp ? [{ pct: sov.competitor, color: "#4a9fd8" }] : []),
      { pct: sov.rival, color: SECONDARY },
      { pct: sov.other, color: INK.borderStrong },
    ];
    y = drawStackedBar(doc, y, segments);
    y = drawLegendRow(doc, y, `You · ${brand}`, `${sov.you}%`, YELLOW);
    if (hasComp) y = drawLegendRow(doc, y, competitor, `${sov.competitor}%`, "#4a9fd8");
    y = drawLegendRow(doc, y, rivalLabel, `${sov.rival}%`, SECONDARY);
    y = drawLegendRow(doc, y, "Everyone else", `${sov.other}%`, INK.borderStrong);
    y += 10;
  }

  // ---------- How AI talks about you (sentiment) ----------
  if (sentiment && (mentionCount ?? 2) >= 2) {
    y = drawSectionTitle(doc, "How AI talks about you", y);
    y = drawParagraph(doc, `"${sentiment.positioning}"`, y, { bold: true, size: 12, gap: 6 });
    if (sentiment.summary) y = drawParagraph(doc, sentiment.summary, y, { size: 9.5, color: SECONDARY, gap: 20 });
  }

  // ---------- The websites AI trusted (complete list) ----------
  const allSources = trustedSources || [];
  if (allSources.length > 0) {
    y = drawSectionTitle(doc, "The websites AI trusted", y);
    y = drawTable(doc, {
      y,
      colWidths: [contentWidth(doc) * 0.7, contentWidth(doc) * 0.3],
      header: ["Source", "Times read"],
      rows: allSources.map(([source, count]) => [source, String(count)]),
    });
    y = drawParagraph(
      doc,
      "Getting your product featured on these sites is the most direct path into AI's answers.",
      y,
      { size: 9.5, color: SECONDARY, gap: 20 }
    );
  }

  // ---------- Question-by-question breakdown ----------
  const hasAnyQuestions = ENGINE_ORDER.some((e) => (engines?.[e] || []).length > 0);
  if (hasAnyQuestions) {
    y = drawSectionTitle(doc, "Question by question", y);
    ENGINE_ORDER.forEach((engine) => {
      const rows = (engines?.[engine] || []).filter((r) => r.source !== "missing");
      if (rows.length === 0) return;
      y = ensureSpace(doc, y, 20);
      doc.font("Helvetica-Bold").fontSize(11).fillColor(YELLOW).text(ENGINE_LABELS[engine], PAGE_MARGIN, y);
      y = doc.y + 6;
      rows.forEach((row) => {
        const recLine = (row.recs || [])
          .slice(0, 5)
          .map((rec, i) => `${i + 1}. ${rec?.brand || rec?.product || "—"}`)
          .join("   ");
        const qText = `"${row.text}"`;
        const rText = recLine || "No recommendations recorded.";
        // Measure both lines' REAL wrapped height before reserving space —
        // question text length varies a lot, and a fixed guess here
        // previously underestimated it (same underlying bug drawParagraph
        // had — see its own comment).
        doc.font("Helvetica").fontSize(9.5);
        const qHeight = doc.heightOfString(qText, { width: contentWidth(doc), lineGap: 2 });
        doc.font("Helvetica").fontSize(8.5);
        const rHeight = doc.heightOfString(rText, { width: contentWidth(doc) });
        y = ensureSpace(doc, y, qHeight + rHeight + 12);
        doc.font("Helvetica").fontSize(9.5).fillColor(TEXT).text(qText, PAGE_MARGIN, y, {
          width: contentWidth(doc),
          lineGap: 2,
        });
        y = doc.y + 2;
        doc.font("Helvetica").fontSize(8.5).fillColor(SECONDARY).text(rText, PAGE_MARGIN, y, {
          width: contentWidth(doc),
        });
        y = doc.y + 10;
      });
      y += 6;
    });
  }

  // ---------- Recommended actions ----------
  y = drawSectionTitle(doc, "Recommended actions", y);
  fixPlan.forEach((item, i) => {
    // Real heights, not a fixed guess — see drawParagraph's own comment on
    // why an underestimate here previously caused pdfkit's own mid-block
    // auto-pagination (an unpainted, unfooted extra page).
    doc.font("Helvetica-Bold").fontSize(11);
    const titleHeight = doc.heightOfString(`${i + 1}. ${item.title}`, { width: contentWidth(doc) });
    doc.font("Helvetica").fontSize(9.5);
    const whyHeight = doc.heightOfString(item.why, { width: contentWidth(doc), lineGap: 2 });
    y = ensureSpace(doc, y, titleHeight + whyHeight + 34);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(TEXT).text(`${i + 1}. ${item.title}`, PAGE_MARGIN, y, {
      width: contentWidth(doc),
    });
    y = doc.y + 3;
    doc.font("Helvetica").fontSize(9.5).fillColor(SECONDARY).text(item.why, PAGE_MARGIN, y, {
      width: contentWidth(doc),
      lineGap: 2,
    });
    y = doc.y + 3;
    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor(TEXT)
      .text(`Difficulty: ${item.difficulty}   ·   Expected effect: `, PAGE_MARGIN, y, { continued: true })
      .font("Helvetica")
      .fillColor(SECONDARY)
      .text(item.effect);
    y = doc.y + 16;
  });

  // End box — no signoff (unsigned), per spec.
  y = ensureSpace(doc, y, 78);
  y += 8;
  const boxHeight = 60;
  doc.roundedRect(PAGE_MARGIN, y, contentWidth(doc), boxHeight, 8).fill(CARD).strokeColor(YELLOW).lineWidth(1.5).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .fillColor(TEXT)
    .text("Want this done for you?", PAGE_MARGIN + 16, y + 14, { width: contentWidth(doc) - 32 });
  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor(SECONDARY)
    .text("Reply to your report email.", PAGE_MARGIN + 16, y + 32, {
      width: contentWidth(doc) - 32,
    });

  // ---------- Footer, exactly once per page ----------
  // The actual root cause of the old "triple-repeat" bug: drawing text at
  // a Y position past a page's own margins.bottom makes pdfkit's .text()
  // think the content overflows and auto-adds a NEW page for it — even on
  // a page you just explicitly switchToPage()'d to. Two .text() calls per
  // footer meant TWO extra pages got silently inserted per real page (one
  // per call), each carrying only half the footer — exactly the repeat
  // that was reported. Fix: zero out this page's bottom margin only for
  // the footer draw, then restore it, so pdfkit never thinks it needs to
  // paginate for content that's deliberately IN the margin.
  const range = doc.bufferedPageRange();
  const pageCount = range.count;
  for (let i = range.start; i < range.start + pageCount; i++) {
    doc.switchToPage(i);
    const savedBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(SECONDARY)
      .text(`Generated by StockedBy — stockedby.com`, PAGE_MARGIN, doc.page.height - PAGE_MARGIN + 6, {
        width: contentWidth(doc) - 60,
        lineBreak: false,
        ellipsis: true,
      });
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(SECONDARY)
      .text(`${i - range.start + 1} / ${pageCount}`, doc.page.width - PAGE_MARGIN - 50, doc.page.height - PAGE_MARGIN + 6, {
        width: 50,
        align: "right",
        lineBreak: false,
      });
    doc.page.margins.bottom = savedBottomMargin;
  }

  return docToBuffer(doc);
}
