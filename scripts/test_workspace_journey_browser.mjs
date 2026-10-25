import assert from "node:assert/strict";
import { chromium } from "playwright";
import { teamDemo } from "../lib/team/demo.js";
import { prototypeArtifact, samplePrototype } from "../lib/studio/prototype.js";

// Real UI and autosave wiring, fictional teams and mocked AI: no production data.
const base = process.env.STUDIO_TEST_URL || "http://localhost:3003";
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || "chrome" });
const errors = [];
let page;
try {
  for (const role of ["owner", "editor", "reviewer", "viewer"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    page = await context.newPage();
    page.on("pageerror", e => errors.push(e.message));
    const team = teamDemo();
    team.members.find(m => m.user_id === "maya").role = role;
    const row = team.projects[0], prd = row.document.nodes.find(n => n.type === "requirements"), stories = row.document.nodes.find(n => n.type === "stories"), prototype = row.document.nodes.find(n => n.type === "prototype");
    const requests = [];
    let writes = 0, failNext = true;
    await context.route("**/api/team**", async route => {
      if (new URL(route.request().url()).pathname === "/api/team/auth") return route.fulfill({ json: { configured: true, user: { id: "maya", email: "maya@example.com" } } });
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        assert.ok(["owner", "editor"].includes(role), "Reader must not write");
        assert.equal(body.action, "save_project");
        assert.equal(body.version, row.version);
        row.document = body.document; row.version++; writes++;
        return route.fulfill({ json: { result: { version: row.version } } });
      }
      return route.fulfill({ json: team });
    });
    await context.route("**/api/studio/generate", async route => {
      if (route.request().method() === "GET") return route.fulfill({ json: { configured: true } });
      const body = route.request().postDataJSON(); requests.push(body);
      if (failNext) { failNext = false; return route.fulfill({ status: 502, json: { error: "Fictional generation interruption." } }); }
      return route.fulfill({ json: { artifact: { ...prototypeArtifact(samplePrototype(), body), model: "Fictional test response" } } });
    });
    await page.goto(`${base}/workspace`);
    await page.getByRole("button").filter({ has: page.getByRole("heading", { name: row.document.name, exact: true }) }).click();
    await page.getByRole("heading", { name: prd.artifact.title, exact: true }).waitFor();
    assert.equal(await page.getByRole("dialog").count(), 0, "Opening a project must not trap it in a modal");
    if (["owner", "editor"].includes(role)) {
      assert.equal(await page.getByRole("button", { name: "Open editor", exact: true }).count(), 0);
      await page.getByRole("button", { name: /^Resolve questions/ }).click();
      assert.ok(await page.getByRole("heading", { name: "Questions & decisions", exact: true }).isVisible());
      const edit = page.getByRole("button", { name: "Edit", exact: true });
      const editBounds = await edit.boundingBox();
      assert.ok(editBounds.y >= 0 && editBounds.y < 180, "Document actions must remain pinned while reading");
      await edit.click();
      const content = page.getByRole("textbox", { name: "Document content (Markdown)", exact: true });
      await content.fill("## Decision\nPreserve the pilot scope and validate one complete journey.");
      await page.getByRole("button", { name: "Finish editing", exact: true }).click();
      await page.getByRole("button", { name: "Save now", exact: true }).click();
      await page.getByText(`Saved online · version ${row.version}`, { exact: true }).waitFor();
      await page.reload();
      await page.getByRole("heading", { name: "Decision", exact: true }).waitFor();
      assert.ok(new URL(page.url()).hash.includes(`project=${row.id}`));
      await page.getByRole("button", { name: "Discussion & changes", exact: true }).click();
      await page.getByRole("button", { name: /^User stories/ }).click();
      await page.getByRole("heading", { name: stories.artifact.title, exact: true }).waitFor();
      await page.reload();
      await page.getByRole("heading", { name: stories.artifact.title, exact: true }).waitFor();
      // Generation must wait for explicit setup; a failed rebuild retains the old output.
      await page.getByRole("tab", { name: "Prototype", exact: true }).click();
      const oldTitle = prototype.artifact.prototype.name;
      await page.getByRole("button", { name: "Change prototype setup", exact: true }).click();
      assert.equal(requests.length, 0);
      await page.getByRole("radio", { name: /Tablet/ }).check();
      await page.getByRole("textbox", { name: /Who is this for/ }).fill("Operations staff");
      await page.getByRole("textbox", { name: /Which journey/ }).fill("Review a new request and move it to the next stage.");
      await page.screenshot({ path: `/tmp/stockedby-prototype-setup-${role}.png` });
      await page.getByRole("button", { name: "Rebuild prototype", exact: false }).click();
      await page.getByRole("alert").filter({ hasText: "Fictional generation interruption" }).waitFor();
      await page.locator(`iframe[title="${oldTitle} interactive prototype"]`).waitFor();
      assert.equal(requests.at(-1).prototypeSettings.platform, "tablet");
      await page.getByRole("button", { name: "Save now", exact: true }).click();
      await page.getByText(`Saved online · version ${row.version}`, { exact: true }).waitFor();
      await page.reload();
      await page.getByRole("button", { name: "Change prototype setup", exact: true }).click();
      assert.ok(await page.getByRole("radio", { name: /Tablet/ }).isChecked());
      assert.equal(await page.getByRole("textbox", { name: /Who is this for/ }).inputValue(), "Operations staff");
      await page.getByRole("button", { name: "Rebuild prototype", exact: false }).click();
      const frame = page.frameLocator('iframe[title$="interactive prototype"]');
      await frame.locator("body.target-tablet").waitFor();
      assert.equal(await page.getByRole("combobox", { name: "Preview size" }).inputValue(), "tablet");
      await page.screenshot({ path: `/tmp/stockedby-tablet-journey-${role}.png` });
      await page.getByRole("button", { name: "Save now", exact: true }).click();
      await page.getByText(`Saved online · version ${row.version}`, { exact: true }).waitFor();
      await page.reload();
      await frame.locator("body.target-tablet").waitFor();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("tab", { name: "2. Your documents" }).click();
      await page.getByRole("combobox", { name: "Open document" }).selectOption(prd.id);
      await page.getByRole("button", { name: /^Resolve questions/ }).click();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const mobileEdit = await edit.boundingBox();
      assert.ok(mobileEdit.y >= 0 && mobileEdit.y < 260);
      await page.screenshot({ path: `/tmp/stockedby-project-mobile-${role}.png` });
      assert.ok(writes > 0);
    } else {
      assert.equal(await page.getByRole("button", { name: "Edit", exact: true }).count(), 0);
      assert.equal(await page.getByRole("button", { name: "Save now", exact: true }).count(), 0);
      await page.getByRole("combobox", { name: "Read document" }).selectOption(stories.id);
      await page.getByRole("heading", { name: stories.artifact.title, exact: true }).waitFor();
      await page.reload();
      await page.getByRole("heading", { name: stories.artifact.title, exact: true }).waitFor();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const back = page.getByRole("button", { name: /Discussion & changes/ }).first();
      const box = await back.boundingBox();
      assert.ok(box.y >= 0 && box.y < 100, "Read-only toolbar must remain visible");
      assert.equal(writes, 0); assert.equal(requests.length, 0);
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log("PASS: owner/editor direct documents; pinned edit/resolve/continue; save and refresh same document; discussion return; prototype setup before AI; failed rebuild retention; saved device/audience/journey; tablet layout/export contract; mobile overflow; reviewer/viewer read-only full page; no customer writes or paid AI.");
} catch (e) {
  if (page && !page.isClosed()) await page.screenshot({ path: "/tmp/stockedby-workspace-journey-failure.png", fullPage: true });
  throw e;
} finally { await browser.close(); }
