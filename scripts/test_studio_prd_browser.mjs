import assert from "node:assert/strict";
import { chromium } from "playwright";
import ExcelJS from "exceljs";
import mammoth from "mammoth";
import { demoProject } from "../lib/studio/demo.js";

// Real file extraction, mocked generation: no OpenAI calls or customer data.
const base = process.env.STUDIO_TEST_URL || "http://localhost:3002";
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || "chrome" });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", e => errors.push(e.message));
const requests = [];
let failNext = true;
const sample = demoProject().nodes.find(n => n.type === "requirements").artifact;
await page.route("**/api/studio/generate", async route => {
  if (route.request().method() === "GET") return route.fulfill({ json: { configured: true } });
  requests.push(route.request().postDataJSON());
  if (failNext) { failNext = false; return route.fulfill({ status: 502, json: { error: "Test interruption. Please retry; your inputs are unchanged." } }); }
  return route.fulfill({ json: { artifact: { ...sample, title: "Application onboarding PRD", model: "Browser test fixture" } } });
});
try {
  await page.goto(`${base}/studio`);
  await page.getByRole("heading", { name: "Your inputs. One clear PRD." }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Create PRD", exact: true }).isDisabled(), true);
  assert.equal(await page.getByRole("tab", { name: "Workflow", exact: true }).count(), 0);
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet("Requirements").addRows([["Requirement", "Owner"], ["Save the application and allow the customer to return later", "Product team"]]);
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  await page.getByLabel("Upload project document or image").setInputFiles({ name: "requirements.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer });
  const text = page.getByRole("dialog").locator("textarea");
  await page.waitForFunction(() => [...document.querySelectorAll("textarea")].some(t => t.value.includes("Worksheet: Requirements")));
  assert.ok((await text.inputValue()).includes("Save the application"));
  assert.equal(requests.length, 0, "upload must not trigger generation");
  await page.getByRole("button", { name: "Add to project", exact: true }).click();
  await page.screenshot({ path: "/tmp/stockedby-prd-inputs.png", fullPage: true });
  await page.getByRole("button", { name: "Create PRD", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Test interruption" }).waitFor();
  assert.equal(requests[0].type, "requirements", "direct PRD creation must skip the brief");
  assert.ok(requests[0].sources[0].text.includes("Worksheet: Requirements"));
  await page.getByRole("button", { name: "Create PRD", exact: true }).click();
  await page.getByRole("heading", { name: "Application onboarding PRD", exact: true }).waitFor();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const editor = page.getByLabel("Document content (Markdown)");
  await editor.fill((await editor.inputValue()) + "\n\nVerified manual change.");
  await page.getByRole("button", { name: "Finish editing", exact: true }).click();
  await page.waitForFunction(() => localStorage.getItem("stockedby.studio.v1")?.includes("Verified manual change."));
  await page.reload();
  await page.getByRole("heading", { name: "Application onboarding PRD", exact: true }).waitFor();
  assert.ok(await page.getByText("Verified manual change.", { exact: true }).isVisible());
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Word", exact: true }).click();
  const download = await downloaded;
  assert.match(download.suggestedFilename(), /\.docx$/);
  const exported = (await mammoth.extractRawText({ path: await download.path() })).value;
  assert.ok(exported.includes("Verified manual change."));
  assert.ok(!exported.includes("Project context"), "download should contain the selected document only");
  await page.screenshot({ path: "/tmp/stockedby-prd-output.png", fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "mobile output must not overflow horizontally");
  await page.screenshot({ path: "/tmp/stockedby-prd-mobile.png", fullPage: false });
  await page.getByRole("tab", { name: "1. Inputs" }).click();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "mobile inputs must not overflow horizontally");
  assert.ok(await page.getByRole("button", { name: "Open your PRD" }).isVisible());
  // Recover the exact reported state: a generated brief, with PRD still empty.
  const briefOnly = demoProject();
  briefOnly.nodes = briefOnly.nodes.map(node => node.type === "brief" ? node : { ...node, artifact: null });
  const recoveryContext = await browser.newContext();
  const recovery = await recoveryContext.newPage();
  await recovery.addInitScript(project => localStorage.setItem("stockedby.studio.v1", JSON.stringify({ projects: [project], active: project.id })), briefOnly);
  await recovery.goto(`${base}/studio`);
  await recovery.getByRole("heading", { name: briefOnly.nodes.find(n => n.type === "brief").artifact.title, exact: true }).waitFor();
  assert.ok(await recovery.getByRole("button", { name: "Create PRD", exact: true }).isVisible());
  await recoveryContext.close();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/workspace?demo=1`);
  await page.getByRole("button").filter({ has: page.getByRole("heading", { name: demoProject().name, exact: true }) }).click();
  await page.getByRole("heading", { name: "Product requirements (PRD)", exact: true }).waitFor();
  assert.ok(await page.getByRole("button", { name: "Download Word", exact: true }).isVisible());
  await page.screenshot({ path: "/tmp/stockedby-prd-team.png", fullPage: false });
  assert.deepEqual(errors, []);
  console.log("PASS: real XLSX upload; no implicit AI call; direct PRD; failure/retry; automatic output; edit/refresh; single-document Word export; desktop/mobile; existing brief recovery; shared editor.");
} catch (error) {
  await page.screenshot({ path: "/tmp/stockedby-prd-test-failure.png", fullPage: true });
  throw error;
} finally { await browser.close(); }
