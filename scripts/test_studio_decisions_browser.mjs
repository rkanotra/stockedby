import assert from "node:assert/strict";
import { chromium } from "playwright";
import mammoth from "mammoth";
import { demoProject } from "../lib/studio/demo.js";
import { teamDemo } from "../lib/team/demo.js";

// Fictional project; generation is intercepted. No paid AI or customer writes.
const base = process.env.STUDIO_TEST_URL || "http://localhost:3002";
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || "chrome" });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [], requests = [];
page.on("pageerror", e => errors.push(e.message));
const sample = demoProject();
const project = structuredClone(sample);
project.demo = false;
project.nodes = project.nodes.map(n => n.type === "requirements" ? n : { ...n, artifact: null });
const prd = project.nodes.find(n => n.type === "requirements");
prd.artifact.title = "Fictional onboarding PRD";
prd.artifact.questions = ["Who owns invitations?", "What is the pilot size?"];
prd.artifact.findings = [{ severity: "blocker", issue: "Retention is undecided.", sourceId: "", quote: "" }];
let failNext = true;
await context.route("**/api/studio/generate", async route => {
  if (route.request().method() === "GET") return route.fulfill({ json: { configured: true } });
  const input = route.request().postDataJSON(); requests.push(input);
  if (failNext) { failNext = false; return route.fulfill({ status: 502, json: { error: "Fictional interruption. Retry this step." } }); }
  const artifact = input.type === "requirements" ? { ...prd.artifact, content: "## Ownership\nOperations owns invitations.", questions: ["What is the pilot size?"], findings: prd.artifact.findings } : sample.nodes.find(n => n.type === input.type).artifact;
  return route.fulfill({ json: { artifact: { ...artifact, model: "Browser test fixture" } } });
});
await context.addInitScript(project => {
  if (window !== window.top) return;
  if (!localStorage.getItem("stockedby.studio.v1")) localStorage.setItem("stockedby.studio.v1", JSON.stringify({ projects: [project], active: project.id }));
}, project);
const card = text => page.getByRole("article", { name: text, exact: true });
const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem("stockedby.studio.v1")).projects[0]);
try {
  await page.goto(`${base}/studio`);
  await page.getByRole("heading", { name: prd.artifact.title, exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Continue with this PRD" }).count(), 2);
  await page.getByRole("button", { name: "Continue with this PRD" }).first().click();
  await page.getByRole("dialog").getByText("3 open queries carry forward.", { exact: false }).waitFor();
  await page.screenshot({ path: "/tmp/stockedby-prd-next-step.png" });
  await page.getByRole("button", { name: "Close dialog" }).click();
  await card("Who owns invitations?").getByRole("button", { name: "Answer", exact: true }).click();
  await page.getByRole("textbox", { name: "Answer: Who owns invitations?", exact: true }).fill("Operations owns invitations.");
  await card("Who owns invitations?").getByRole("button", { name: "Save answer", exact: true }).click();
  await card("Retention is undecided.").getByRole("button", { name: "Ignore", exact: true }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("stockedby.studio.v1")).projects[0].queryResolutions?.length === 2);
  await page.reload();
  await page.getByText("2 saved answers & ignored queries", { exact: true }).click();
  await card("Who owns invitations?").getByText("Operations owns invitations.", { exact: true }).waitFor();
  await card("Retention is undecided.").getByRole("button", { name: "Reopen", exact: true }).click();
  await card("Retention is undecided.").getByRole("button", { name: "Ignore", exact: true }).click();
  await page.getByRole("button", { name: "Update PRD", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Fictional interruption" }).waitFor();
  assert.equal((await stored()).queryResolutions.length, 2);
  assert.equal(requests[0].queryResolutions.find(q => q.status === "answered").answer, "Operations owns invitations.");
  // Continue with a stale draft and unresolved queries, without being forced to regenerate.
  await page.getByRole("button", { name: "Continue with this PRD" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: /User stories/ }).click();
  await page.getByRole("heading", { name: sample.nodes.find(n => n.type === "stories").artifact.title, exact: true }).waitFor();
  assert.equal(requests.at(-1).type, "stories");
  assert.ok(requests.at(-1).upstream.some(n => n.type === "requirements" && n.questions.includes("What is the pilot size?")));
  await page.getByRole("combobox", { name: "Open document" }).selectOption(prd.id);
  await page.getByRole("button", { name: "Update PRD", exact: true }).click();
  await page.getByRole("heading", { name: "Ownership", exact: true }).waitFor();
  await page.getByText("2 saved answers & ignored queries", { exact: true }).click();
  await card("Who owns invitations?").getByText("Operations owns invitations.", { exact: true }).waitFor();
  await page.getByRole("region", { name: "Questions and decisions" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/stockedby-prd-query-controls.png" });
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Word", exact: true }).click();
  const downloaded = await downloadEvent;
  const word = (await mammoth.extractRawText({ path: await downloaded.path() })).value;
  assert.ok(word.includes("[answered] Who owns invitations?"));
  assert.ok(word.includes("[ignored] Retention is undecided."));
  await page.getByRole("button", { name: "Continue with this PRD" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: /Working prototype/ }).click();
  await page.locator('iframe[title$="interactive prototype"]').waitFor();
  assert.ok(requests.at(-1).upstream.some(n => n.type === "requirements"));
  await page.getByRole("tab", { name: "2. Your documents" }).click();
  await page.getByRole("combobox", { name: "Open document" }).selectOption(prd.id);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Continue with this PRD" }).first().click();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: "/tmp/stockedby-prd-next-mobile.png" });
  await page.getByRole("dialog").getByRole("button", { name: /Test plan/ }).click();
  await page.getByRole("heading", { name: sample.nodes.find(n => n.type === "tests").artifact.title, exact: true }).waitFor();
  assert.equal(requests.at(-1).type, "tests");
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("stockedby.studio.v1")).projects[0].nodes.some(n => n.type === "tests" && n.artifact));
  assert.equal((await stored()).nodes.find(n => n.id === prd.id).artifact.approval, null);
  // Exercise the actual shared-editor save request and recovery against a fake server.
  // This isolates storage wiring without touching a real team's initiative.
  const team = teamDemo();
  team.members.find(m => m.user_id === "maya").role = "owner";
  team.projects = [{ ...team.projects[0], document: structuredClone(project) }];
  let teamWrites = 0;
  await context.route("**/api/team**", async route => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/team/auth") return route.fulfill({ json: { configured: true, user: { id: "maya", email: "maya@example.com" } } });
    if (route.request().method() === "POST") {
      const input = route.request().postDataJSON();
      assert.equal(input.action, "save_project");
      assert.equal(input.version, team.projects[0].version);
      team.projects[0] = { ...team.projects[0], document: input.document, version: input.version + 1 };
      teamWrites++;
      return route.fulfill({ json: { result: { version: input.version + 1 } } });
    }
    return route.fulfill({ json: team });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/workspace`);
  const openTeam = async () => {
    await page.getByRole("button").filter({ has: page.getByRole("heading", { name: project.name, exact: true }) }).click();
    await page.getByRole("button", { name: "Open editor", exact: true }).click();
    await page.getByRole("heading", { name: prd.artifact.title, exact: true }).waitFor();
  };
  await openTeam();
  await card("Who owns invitations?").getByRole("button", { name: "Answer", exact: true }).click();
  await page.getByRole("textbox", { name: "Answer: Who owns invitations?", exact: true }).fill("The shared operations team.");
  await card("Who owns invitations?").getByRole("button", { name: "Save answer", exact: true }).click();
  const savedVersion = team.projects[0].version + 1;
  await page.getByRole("button", { name: "Save now", exact: true }).click();
  await page.getByText(`Saved online · version ${savedVersion}`, { exact: true }).waitFor();
  assert.ok(teamWrites > 0);
  assert.equal(team.projects[0].document.queryResolutions[0].answer, "The shared operations team.");
  await page.reload();
  await openTeam();
  await page.getByText("1 saved answers & ignored queries", { exact: true }).click();
  await card("Who owns invitations?").getByText("The shared operations team.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Continue with this PRD" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: /User stories/ }).click();
  await page.getByRole("heading", { name: sample.nodes.find(n => n.type === "stories").artifact.title, exact: true }).waitFor();
  await page.screenshot({ path: "/tmp/stockedby-prd-shared-next.png" });
  assert.deepEqual(errors, []);
  console.log("PASS: per-query answer/ignore/reopen; refresh; failed update retains answers; AI payload; Word export; PRD to stories/prototype/tests with open queries; mobile chooser; shared save/reload payload; no automatic approval.");
} catch (error) {
  await page.screenshot({ path: "/tmp/stockedby-decisions-failure.png", fullPage: true });
  throw error;
} finally { await browser.close(); }
