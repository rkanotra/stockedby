import { PDFDocument, registerStdFonts } from "pdfkit";
import Helvetica from "pdfkit/standard-fonts/Helvetica";
import HelveticaBold from "pdfkit/standard-fonts/HelveticaBold";
import { ENGINE_ORDER, ENGINE_LABELS, MARKET_LABELS, matches, categoryMidSentence } from "../scoring";
import { buildAppearanceStory } from "../layerOne";
import { buildFounderReport } from "../founderReport";
import { INK } from "../theme";
import { measureParagraph, paintParagraph } from "./arabicText";

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
// risk the size target for no real gain in a document this text-heavy.
// Ink palette (lib/theme.js) — single source of truth shared with
// lib/email.js and the CSS custom properties in app/globals.css.
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
// forwarded on its own, still traces back to StockedBy.
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

function drawSectionTitle(doc, text, y) {
  y = ensureSpace(doc, y, 30);
  doc.font("Helvetica-Bold").fontSize(14).fillColor(TEXT).text(text, PAGE_MARGIN, y);
  return y + doc.heightOfString(text, { width: contentWidth(doc) }) + 8;
}

// Arabic-aware: query-bank/live-run text (shopper questions, sentiment
// quotes) can be raw Arabic script, which the standard PDF fonts used
// here have no glyphs for at all — measureParagraph/paintParagraph
// (lib/pdf/arabicText.js) detect that, shape + bidi-reorder it, and
// render it with an embedded Arabic font instead; plain Latin text takes
// the exact same fast path as before (doc.heightOfString/doc.text).
function drawParagraph(doc, text, y, opts = {}) {
  const size = opts.size || 10.5;
  const font = opts.bold ? "Helvetica-Bold" : "Helvetica";
  const width = contentWidth(doc);
  // Measure the REAL wrapped height first — a fixed guess here previously
  // underestimated a multi-line paragraph, so ensureSpace let it start too
  // close to the footer and pdfkit's own auto-pagination kicked in
  // mid-paragraph.
  const measured = measureParagraph(doc, text, { font, size, width, lineGap: 3 });
  y = ensureSpace(doc, y, measured.height);
  const endY = paintParagraph(doc, measured, text, PAGE_MARGIN, y, { color: opts.color || TEXT, width, font, size, lineGap: 3 });
  return endY + (opts.gap ?? 12);
}

// Up to 4 lightweight metric chips in a row — never a boxed-card grid
// (CLAUDE.md's redesign phase: "maximum 3-4 metrics, only meaningful/
// accurate denominators").
function drawMetricsRow(doc, y, metrics) {
  if (metrics.length === 0) return y;
  const width = contentWidth(doc);
  const colWidth = width / metrics.length;
  y = ensureSpace(doc, y, 46);
  metrics.forEach((m, i) => {
    const x = PAGE_MARGIN + i * colWidth;
    doc.font("Helvetica-Bold").fontSize(17).fillColor(TEXT).text(m.value, x, y, { width: colWidth - 10, lineBreak: false });
    doc.font("Helvetica").fontSize(8.5).fillColor(SECONDARY).text(m.label, x, y + 22, { width: colWidth - 10 });
  });
  return y + 50;
}

// The Discover -> Consider -> Buy signature visual, same shape and same
// status vocabulary /test's BuyerJourney component uses — screenshot-
// worthy consistency between the web report and the PDF (CLAUDE.md's
// redesign phase). A stage with no data shows "No data yet", never a
// fabricated percentage.
function drawBuyerJourney(doc, y, buyerJourney) {
  y = drawSectionTitle(doc, "AI Buyer Journey", y);
  const width = contentWidth(doc);
  const colWidth = width / buyerJourney.stages.length;
  const rowY = ensureSpace(doc, y, 60);
  const bandColor = { Weak: INK.danger, Growing: YELLOW, Strong: SECONDARY };
  buyerJourney.stages.forEach((s, i) => {
    const x = PAGE_MARGIN + i * colWidth;
    doc.rect(x, rowY, colWidth - 10, 3).fill(s.band ? bandColor[s.band] : INK.borderStrong);
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(SECONDARY).text(s.label.toUpperCase(), x, rowY + 10, {
      width: colWidth - 10,
      characterSpacing: 0.4,
    });
    const statusText = s.pct !== null ? `${s.pct}% · ${s.band}` : "No data yet";
    doc.font("Helvetica-Bold").fontSize(12).fillColor(TEXT).text(statusText, x, rowY + 24, { width: colWidth - 10 });
  });
  y = rowY + 50;
  if (buyerJourney.insight) {
    y = drawParagraph(doc, buyerJourney.insight, y, { bold: true, size: 11.5, gap: 16 });
  }
  return y;
}

// Fixed-row-height table with its own pagination: bounded lists never run
// more than ~8 rows, so a fixed row height stays readable; if a table
// would cross the footer, it starts on a fresh page rather than
// splitting a row across two pages.
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

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

// Per-engine presence — how many of the 3 AI platforms mention the brand
// at all, and per-engine detail for the appendix page.
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
// is skipped entirely, never printed with an empty table. Page 1 is the
// executive story (hero, biggest opportunity, buyer journey, competitor,
// destination); page 2 is evidence + the action plan; an optional page 3
// appendix carries the full per-engine Q&A, only when there's enough
// real content to warrant it — 2 pages by default (CLAUDE.md's redesign
// phase). Reads lib/founderReport.js's buildFounderReport() — the SAME
// function /test's report and the merchant email read — so the PDF can
// never disagree with either about a number.
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
  const dateStr = new Date(generatedAt || Date.now()).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const appearance = buildAppearanceStory(report?.appearanceSummary);
  const founder = buildFounderReport({ report, engines, brand });
  const perEngine = engineAppearance(engines, brand);
  const enginesRecommending = perEngine.filter((e) => e.appeared).length;
  const bestRank = report?.appearanceSummary?.bestRank || null;

  ensureStdFonts();
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN, right: PAGE_MARGIN },
    bufferPages: true,
    info: { Title: `${brand} — AI Visibility Report — StockedBy`, Author: "StockedBy" },
  });
  paintPage(doc);

  // ---------- Page 1: the executive story ----------
  let y = PAGE_MARGIN + 60;
  doc.font("Helvetica").fontSize(10).fillColor(SECONDARY).text(
    [brand, categoryName ? categoryMidSentence(categoryName) : null, marketLabel, dateStr].filter(Boolean).join("  ·  "),
    PAGE_MARGIN,
    y,
    { width: contentWidth(doc) }
  );
  y = doc.y + 8;

  // Same headline logic as components/test/report/AIVisibilityHero.js —
  // never a generic "AI Visibility Report" title, the real result.
  const headline =
    appearance.verdict === "NO"
      ? `AI isn't recommending ${brand} yet.`
      : appearance.verdict === "YES" && !founder.biggestOpportunity
      ? `AI knows ${brand} — and recommends you.`
      : `AI knows ${brand}. But it isn't choosing you first.`;
  doc.font("Helvetica-Bold").fontSize(24).fillColor(TEXT).text(headline, PAGE_MARGIN, y, { width: contentWidth(doc) });
  y = doc.y + 14;
  doc.rect(PAGE_MARGIN, y, contentWidth(doc), 2).fill(YELLOW);
  y += 16;

  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(TEXT)
    .text(`${founder.visibility.score} / 100`, PAGE_MARGIN, y, { continued: true })
    .font("Helvetica")
    .fontSize(10)
    .fillColor(SECONDARY)
    .text(`   ${founder.visibility.band} visibility`);
  y = doc.y + 10;

  y = drawMetricsRow(doc, y, [
    { value: `${appearance.appearedIn} of ${appearance.totalAttempted}`, label: "Shopper needs where you appeared" },
    ...(bestRank ? [{ value: `#${bestRank}`, label: "Best position" }] : []),
    { value: `${enginesRecommending} of 3`, label: "AI platforms recommending you" },
    ...(founder.destinationSplit ? [{ value: `${founder.destinationSplit.ownSitePct}%`, label: "Purchase links to your store" }] : []),
  ]);
  y += 8;

  // ---------- Biggest opportunity ----------
  if (founder.biggestOpportunity) {
    y = drawSectionTitle(doc, "Biggest opportunity", y);
    y = drawParagraph(doc, founder.biggestOpportunity.title, y, { bold: true, size: 13, gap: 4 });
    y = drawParagraph(doc, founder.biggestOpportunity.detail, y, { size: 10, color: SECONDARY, gap: 18 });
  }

  // ---------- AI Buyer Journey ----------
  y = drawBuyerJourney(doc, y, founder.buyerJourney);

  // ---------- Who is winning instead ----------
  if (founder.competitorThreat) {
    const { label, appearedIn, totalQuestions, avgRank, others } = founder.competitorThreat;
    y = drawSectionTitle(doc, "Who is winning instead?", y);
    y = drawParagraph(doc, `${label} is your biggest AI competitor.`, y, { bold: true, size: 12.5, gap: 4 });
    const rankLine = avgRank !== null ? ` · Average position #${avgRank}` : "";
    y = drawParagraph(doc, `Recommended in ${appearedIn} of ${totalQuestions} shopper questions${rankLine}.`, y, {
      size: 9.5,
      color: SECONDARY,
      gap: 10,
    });
    if (others.length > 0) {
      y = drawParagraph(
        doc,
        others.map((c) => `${c.label} (${c.count} appearance${c.count === 1 ? "" : "s"})`).join("   ·   "),
        y,
        { size: 9, color: SECONDARY, gap: 18 }
      );
    }
  }

  // ---------- Where AI sends shoppers ----------
  if (founder.destinationSplit) {
    const { ownSitePct, marketplacePct } = founder.destinationSplit;
    y = drawSectionTitle(doc, "Where AI sends shoppers", y);
    const barY = ensureSpace(doc, y, 14);
    const width = contentWidth(doc);
    if (ownSitePct > 0) doc.rect(PAGE_MARGIN, barY, (ownSitePct / 100) * width, 12).fill(YELLOW);
    if (marketplacePct > 0) doc.rect(PAGE_MARGIN + (ownSitePct / 100) * width, barY, (marketplacePct / 100) * width, 12).fill(INK.borderStrong);
    y = barY + 22;
    y = drawParagraph(doc, `${ownSitePct}% your website   ·   ${marketplacePct}% marketplaces`, y, {
      size: 9.5,
      color: SECONDARY,
      gap: 18,
    });
  } else {
    y = drawSectionTitle(doc, "Where AI sends shoppers", y);
    y = drawParagraph(doc, "We couldn't reliably determine where AI sends shoppers for this test.", y, {
      size: 9.5,
      color: SECONDARY,
      gap: 18,
    });
  }

  // ---------- Page 2: evidence + action plan ----------
  y = newPage(doc);

  // How AI describes the brand — only a real, grounded positioning quote
  // (hard rule 2: sentiment must be grounded in >=2 real mentions, same
  // gate the web report and email use); never a narrative invented from
  // one isolated response.
  y = drawSectionTitle(doc, "How AI describes your brand", y);
  if (sentiment && (mentionCount ?? 2) >= 2) {
    y = drawParagraph(doc, `"${sentiment.positioning}"`, y, { bold: true, size: 12, gap: 6 });
    if (sentiment.summary) y = drawParagraph(doc, sentiment.summary, y, { size: 9.5, color: SECONDARY, gap: 18 });
  } else {
    y = drawParagraph(doc, "No clear positioning pattern yet.", y, { size: 10, color: SECONDARY, gap: 18 });
  }

  // Sources appearing in AI research — the real backend semantic (a
  // citation count from computeTrustedSources, not a claim about how many
  // times a page was "read"), capped at 5 on this summary page.
  const topSources = (trustedSources || []).slice(0, 5);
  if (topSources.length > 0) {
    y = drawSectionTitle(doc, "Sources appearing in AI research", y);
    y = drawTable(doc, {
      y,
      colWidths: [contentWidth(doc) * 0.7, contentWidth(doc) * 0.3],
      header: ["Source", "References"],
      rows: topSources.map(([source, count]) => [source, String(count)]),
    });
    y = drawParagraph(
      doc,
      "These external sources appeared frequently in the research behind this test.",
      y,
      { size: 9, color: SECONDARY, gap: 18 }
    );
  }

  // Most important questions — biggest loss + best result only, full
  // rankings live in the appendix.
  const organicRows = ENGINE_ORDER.flatMap((e) =>
    (engines?.[e] || []).filter((r) => r.source !== "missing" && r.archetype !== "branded-routing")
  );
  if (organicRows.length > 0) {
    const withRank = organicRows.map((r) => ({
      row: r,
      idx: (r.recs || []).findIndex((rec) => rec && (matches(brand, rec.brand) || matches(brand, rec.product))),
    }));
    const win = [...withRank].filter((r) => r.idx >= 0).sort((a, b) => a.idx - b.idx)[0];
    const loss = withRank.find((r) => r.idx < 0);
    y = drawSectionTitle(doc, "Most important questions", y);
    if (win) {
      y = drawParagraph(doc, `Best result: "${win.row.text}"`, y, { size: 9.5, color: SECONDARY, gap: 2 });
      y = drawParagraph(doc, `${brand} ranked #${win.idx + 1}.`, y, { bold: true, size: 10.5, gap: 12 });
    }
    if (loss) {
      y = drawParagraph(doc, `Biggest loss: "${loss.row.text}"`, y, { size: 9.5, color: SECONDARY, gap: 2 });
      y = drawParagraph(doc, `${brand} wasn't recommended.`, y, { bold: true, size: 10.5, gap: 18 });
    }
  }

  // ---------- Action plan ----------
  if (founder.actions.length > 0) {
    y = drawSectionTitle(doc, "What should you do next?", y);
    founder.actions.forEach((item, i) => {
      doc.font("Helvetica-Bold").fontSize(11);
      const titleHeight = doc.heightOfString(`${i + 1}. ${item.title}`, { width: contentWidth(doc) });
      doc.font("Helvetica").fontSize(9.5);
      const detailHeight = doc.heightOfString(item.detail, { width: contentWidth(doc), lineGap: 2 });
      y = ensureSpace(doc, y, titleHeight + detailHeight + 30);
      doc.font("Helvetica-Bold").fontSize(11).fillColor(TEXT).text(`${i + 1}. ${item.title}`, PAGE_MARGIN, y, {
        width: contentWidth(doc),
      });
      y = doc.y + 3;
      doc.font("Helvetica").fontSize(9.5).fillColor(SECONDARY).text(item.detail, PAGE_MARGIN, y, {
        width: contentWidth(doc),
        lineGap: 2,
      });
      y = doc.y + 2;
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(YELLOW).text(item.impact, PAGE_MARGIN, y);
      y = doc.y + 14;
    });
  }

  // End box.
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

  // ---------- Optional page 3: AI answers appendix ----------
  // Only when there's enough real content to warrant it — pages 1-2 must
  // never be dense, but the appendix genuinely can be (CLAUDE.md's
  // redesign phase).
  const hasAnyQuestions = ENGINE_ORDER.some((e) => (engines?.[e] || []).filter((r) => r.source !== "missing").length > 0);
  if (hasAnyQuestions) {
    y = newPage(doc);
    y = drawSectionTitle(doc, "AI answers behind this report", y);
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
        const width = contentWidth(doc);
        // row.text is the raw shopper question — for Gulf-Arabic markets
        // this is real Arabic script, not English, so it goes through the
        // same Arabic-aware measure/paint pair drawParagraph uses above
        // rather than a bare doc.heightOfString/doc.text (which produced
        // the mojibake this loop used to render).
        const qMeasured = measureParagraph(doc, qText, { font: "Helvetica", size: 9.5, width, lineGap: 2 });
        const rMeasured = measureParagraph(doc, rText, { font: "Helvetica", size: 8.5, width, lineGap: 0 });
        y = ensureSpace(doc, y, qMeasured.height + rMeasured.height + 12);
        y = paintParagraph(doc, qMeasured, qText, PAGE_MARGIN, y, { color: TEXT, width, font: "Helvetica", size: 9.5, lineGap: 2 }) + 2;
        y = paintParagraph(doc, rMeasured, rText, PAGE_MARGIN, y, { color: SECONDARY, width, font: "Helvetica", size: 8.5, lineGap: 0 }) + 10;
      });
      y += 6;
    });
  }

  // ---------- Footer, exactly once per page ----------
  // The actual root cause of an old "triple-repeat" bug: drawing text at
  // a Y position past a page's own margins.bottom makes pdfkit's .text()
  // think the content overflows and auto-adds a NEW page for it — even on
  // a page you just explicitly switchToPage()'d to. Fix: zero out this
  // page's bottom margin only for the footer draw, then restore it, so
  // pdfkit never thinks it needs to paginate for content that's
  // deliberately IN the margin.
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
