import { PDFDocument, registerStdFonts } from "pdfkit";
import Helvetica from "pdfkit/standard-fonts/Helvetica";
import HelveticaBold from "pdfkit/standard-fonts/HelveticaBold";
import { ENGINE_ORDER, ENGINE_LABELS, MARKET_LABELS, matches, categoryMidSentence } from "../scoring";

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
import {
  buildAppearanceStory,
  buildTopBrands,
  buildDestinationStory,
  buildFixPlan,
} from "../layerOne";

// Light-theme brand palette (hard rule 5's marketing-site tokens — the PDF
// is a document people forward/print, so it follows the light theme, not
// the dark APP/report screens). Standard PDF fonts (Helvetica/Helvetica-
// Bold) are used instead of embedding Bricolage Grotesque/Archivo/IBM Plex
// Mono — embedding webfonts would add a fetch dependency and risk the
// ~300KB size target for no real gain in a document this text-heavy.
const INK = "#16180F";
const YELLOW = "#FFC53D";
const MUTED = "#6b6f5e";
const LINE = "#e4e1d8";
const CREAM = "#fcfbf7";

const PAGE_MARGIN = 50;

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

function drawHeader(doc, { brand, categoryName, marketLabel, dateStr }) {
  doc.font("Helvetica-Bold").fontSize(18).fillColor(INK).text("StockedBy", PAGE_MARGIN, PAGE_MARGIN);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(MUTED)
    .text("AI Visibility Report", PAGE_MARGIN, PAGE_MARGIN + 22);

  const metaLine = [brand, categoryName, marketLabel, dateStr].filter(Boolean).join("  ·  ");
  doc.fontSize(9).fillColor(MUTED).text(metaLine, PAGE_MARGIN, PAGE_MARGIN + 38);

  const ruleY = PAGE_MARGIN + 56;
  doc.rect(PAGE_MARGIN, ruleY, contentWidth(doc), 2).fill(YELLOW);
  doc.fillColor(INK);
  return ruleY + 16;
}

function drawSectionTitle(doc, text, y) {
  doc.font("Helvetica-Bold").fontSize(13).fillColor(INK).text(text, PAGE_MARGIN, y);
  return y + doc.heightOfString(text, { width: contentWidth(doc) }) + 8;
}

function drawParagraph(doc, text, y, opts = {}) {
  doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(opts.size || 10.5).fillColor(opts.color || INK);
  doc.text(text, PAGE_MARGIN, y, { width: contentWidth(doc), lineGap: 3 });
  return doc.y + (opts.gap ?? 12);
}

// Simple fixed-row-height table — good enough for the short, bounded (top
// 5 max) rows every table in this report uses; not a general-purpose
// dynamic-height table engine.
function drawTable(doc, { y, colWidths, header, rows, rowHeight = 22 }) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  let cy = y;

  doc.rect(PAGE_MARGIN, cy, totalWidth, rowHeight).fill(YELLOW);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(INK);
  let cx = PAGE_MARGIN;
  header.forEach((h, i) => {
    doc.text(h, cx + 8, cy + 7, { width: colWidths[i] - 12 });
    cx += colWidths[i];
  });
  cy += rowHeight;

  doc.font("Helvetica").fontSize(9.5);
  rows.forEach((row, ri) => {
    if (ri % 2 === 1) doc.rect(PAGE_MARGIN, cy, totalWidth, rowHeight).fill(CREAM);
    doc.fillColor(INK);
    cx = PAGE_MARGIN;
    row.forEach((cell, i) => {
      doc.text(String(cell), cx + 8, cy + 7, { width: colWidths[i] - 12 });
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

// Per-engine presence — same "did this AI app ever mention the brand"
// check the rest of the report is built from, just surfaced per engine
// instead of summed across all three.
function engineAppearance(engines, brand) {
  return ENGINE_ORDER.map((engine) => {
    const rows = engines?.[engine] || [];
    const appeared = rows.some((row) =>
      (row.recs || []).some((rec) => matches(brand, rec.brand) || matches(brand, rec.product))
    );
    return { engine, appeared };
  });
}

// domain reads only from what's actually true this test — never a fabricated
// paragraph (hard rule 2). Every sentence traces to a real field; a section
// with no underlying data is skipped entirely, never printed with an empty
// table (per the spec's own instruction).
export async function buildReportPdf({
  brand,
  categoryName,
  market,
  brandWebsite,
  report,
  engines,
  sentiment,
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
  const brandsFull = buildTopBrands(engines, brand, 5);
  const destinations = buildDestinationStory(report?.destinations?.yourDestinations);
  const fixPlan = buildFixPlan({
    appearanceSummary: report?.appearanceSummary,
    yourDestinations: report?.destinations?.yourDestinations,
    trustedSources,
    sentiment,
    brandWebsite,
  });
  const perEngine = engineAppearance(engines, brand);
  const bestRank = report?.appearanceSummary?.bestRank || null;

  ensureStdFonts();
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN, right: PAGE_MARGIN },
    bufferPages: true,
    info: { Title: `${brand} — AI Visibility Report — StockedBy`, Author: "StockedBy" },
  });

  // ---------- Page 1: Executive summary ----------
  let y = drawHeader(doc, { brand, categoryName, marketLabel, dateStr });

  const destTotal = destinations.yours + destinations.others;
  const commissionLine =
    destTotal === 0
      ? ""
      : destinations.others > destinations.yours && destinations.topOtherDomain
      ? ` When AI recommends brands in this category, buyers are sent to ${destinations.topOtherDomain} — a sale that pays that shop's commission, not yours.`
      : destinations.yours > 0
      ? " When AI recommends brands in this category, buyers are mostly sent straight to the brand's own site."
      : "";

  const summaryParagraph =
    `We asked ChatGPT, Gemini and Claude the questions real shoppers ask about ${categoryName ? categoryMidSentence(categoryName) : "this category"} in ${marketLabel}. ` +
    `${brand} appeared in ${appearance.appearedIn} of ${appearance.totalAttempted} answers.` +
    commissionLine;

  y = drawSectionTitle(doc, "Executive summary", y);
  y = drawParagraph(doc, summaryParagraph, y, { gap: 18 });

  const verdictRows = [
    ["AI appearance", `${appearance.appearedIn} of ${appearance.totalAttempted} shopper questions`],
    ...(bestRank ? [["Best position", `#${bestRank} when recommended`]] : []),
    ...perEngine.map(({ engine, appeared }) => [ENGINE_LABELS[engine], appeared ? "Mentions you" : "Does not mention you"]),
  ];
  y = drawTable(doc, {
    y,
    colWidths: [contentWidth(doc) * 0.45, contentWidth(doc) * 0.55],
    header: ["What we checked", "What we found"],
    rows: verdictRows,
  });

  // ---------- Page 2: The evidence ----------
  doc.addPage();
  y = PAGE_MARGIN;

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
    y = drawParagraph(doc, leaderLine, y, { size: 9.5, color: MUTED, gap: 20 });
  }

  if (destTotal > 0) {
    y = drawSectionTitle(doc, "Where AI sends buyers to pay", y);
    y = drawTable(doc, {
      y,
      colWidths: [contentWidth(doc) * 0.6, contentWidth(doc) * 0.4],
      header: ["Destination", "Times"],
      rows: [
        ["Your own website", String(destinations.yours)],
        ["Other shops (marketplaces, resellers)", String(destinations.others)],
      ],
    });
    const destExplain =
      destinations.others > destinations.yours
        ? `AI sends more buyers to other shops than to ${brand}'s own website. Every one of those sales pays a marketplace commission instead of going straight to you.`
        : `Most buyers AI sends for ${brand} go straight to the brand's own website — no marketplace commission lost on those sales.`;
    y = drawParagraph(doc, destExplain, y, { size: 9.5, color: MUTED, gap: 20 });
  }

  const topSources = (trustedSources || []).slice(0, 5);
  if (topSources.length > 0) {
    y = drawSectionTitle(doc, "The websites AI trusted", y);
    y = drawTable(doc, {
      y,
      colWidths: [contentWidth(doc) * 0.7, contentWidth(doc) * 0.3],
      header: ["Source", "Times read"],
      rows: topSources.map(([source, count]) => [source, String(count)]),
    });
    y = drawParagraph(
      doc,
      "Getting your product featured on these sites is the most direct path into AI's answers.",
      y,
      { size: 9.5, color: MUTED, gap: 20 }
    );
  }

  // ---------- Page 3: Recommended actions ----------
  doc.addPage();
  y = PAGE_MARGIN;
  y = drawSectionTitle(doc, "Recommended actions", y);

  fixPlan.forEach((item, i) => {
    doc.font("Helvetica-Bold").fontSize(11).fillColor(INK).text(`${i + 1}. ${item.title}`, PAGE_MARGIN, y, {
      width: contentWidth(doc),
    });
    y = doc.y + 3;
    doc.font("Helvetica").fontSize(9.5).fillColor(MUTED).text(item.why, PAGE_MARGIN, y, {
      width: contentWidth(doc),
      lineGap: 2,
    });
    y = doc.y + 3;
    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor(INK)
      .text(`Difficulty: ${item.difficulty}   ·   Expected effect: `, PAGE_MARGIN, y, { continued: true })
      .font("Helvetica")
      .fillColor(MUTED)
      .text(item.effect);
    y = doc.y + 16;
  });

  y += 8;
  const boxHeight = 70;
  doc.roundedRect(PAGE_MARGIN, y, contentWidth(doc), boxHeight, 8).fill(CREAM).strokeColor(YELLOW).lineWidth(1.5).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .fillColor(INK)
    .text("Want this done for you?", PAGE_MARGIN + 16, y + 14, { width: contentWidth(doc) - 32 });
  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor(MUTED)
    .text("Reply to your report email — a real person will respond.", PAGE_MARGIN + 16, y + 32, {
      width: contentWidth(doc) - 32,
    });
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK).text("— Rahul, StockedBy", PAGE_MARGIN + 16, y + 48);

  // ---------- Footer, every page ----------
  const footerText = reportUrl
    ? `Full live report: ${reportUrl}  ·  Generated by StockedBy — check your brand free at stockedby.com`
    : "Generated by StockedBy — check your brand free at stockedby.com";
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(footerText, PAGE_MARGIN, doc.page.height - 34, {
        width: contentWidth(doc),
        align: "center",
      });
  }

  return docToBuffer(doc);
}
