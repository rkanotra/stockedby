import test from "node:test";
import assert from "node:assert/strict";
import { validateInput } from "./generation.js";
import { samplePrototype, prototypeArtifact } from "./prototype.js";
import { prototypeHtml, screenSvg } from "./prototypeRuntime.js";
import { validatePrototypeSettings } from "./prototype-settings.js";

const input = { type: "prototype", name: "Workshop", brief: "Book a repair appointment and track its progress.", instruction: "", sources: [], rules: [], upstream: [] };
test("prototype generation requires an explicit device; documents stay compatible", () => {
  assert.throws(() => validateInput(input), /Choose Web, Mobile or Tablet/);
  assert.throws(() => validateInput({ ...input, prototypeSettings: { platform: "watch" } }), /Choose Web/);
  assert.equal(validateInput({ ...input, type: "requirements" }).type, "requirements");
  const validated = validateInput({ ...input, prototypeSettings: { platform: "tablet", audience: " Store staff ", journey: " Check in a repair " } });
  assert.deepEqual(validated.prototypeSettings, { platform: "tablet", dataScope: "personal", audience: "Store staff", journey: "Check in a repair" });
  assert.throws(() => validatePrototypeSettings({ platform: "web", journey: "x".repeat(801) }), /too long/);
});
test("requested device overrides a contradictory model layout and survives export", () => {
  for (const [platform, layout, width] of [["web", "sidebar", 1100], ["mobile", "mobile", 390], ["tablet", "topbar", 820]]) {
    const spec = samplePrototype();
    spec.layout = platform === "mobile" ? "sidebar" : "mobile";
    const artifact = prototypeArtifact(spec, { ...input, prototypeSettings: { platform, journey: "Book a repair" } });
    assert.equal(artifact.prototype.layout, layout);
    assert.equal(artifact.prototype.targetPlatform, platform);
    assert.equal(artifact.prototypeSettings.journey, "Book a repair");
    assert.ok(prototypeHtml(artifact.prototype).includes(`"targetPlatform":"${platform}"`));
    assert.ok(screenSvg(artifact.prototype).includes(`width="${width}"`));
  }
});
test("legacy prototypes remain readable without a selected device", () => {
  assert.doesNotThrow(() => prototypeHtml(samplePrototype()));
});
