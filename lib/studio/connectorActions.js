import { createHash } from "node:crypto";
import { providerFetch, seal, unseal } from "./oauth.js";
import {
  figmaReference,
  figmaFrames,
  adfText,
  toAdf,
  jiraMarker,
} from "./connectors.js";
const identity = (token) => createHash("sha256").update(token).digest("hex");
export async function connectorAction(input, session, call = providerFetch) {
  const { provider, action } = input,
    token = session.accessToken;
  if (session.provider !== provider) throw Error("Reconnect this provider.");
  if (provider === "figma") {
    if (action !== "import") throw Error("Unsupported Figma operation.");
    const ref = figmaReference(input.url),
      base = `https://api.figma.com/v1/files/${encodeURIComponent(ref.key)}`;
    const data = await call(
      ref.node
        ? `${base}/nodes?ids=${encodeURIComponent(ref.node)}&depth=12`
        : `${base}?depth=12`,
      token,
    );
    return {
      name: data.name,
      version: data.version,
      lastModified: data.lastModified,
      frames: figmaFrames(data, ref.key),
    };
  }
  const sites = await call(
    "https://api.atlassian.com/oauth/token/accessible-resources",
    token,
  );
  if (action === "sites")
    return {
      sites: sites
        .filter((s) => s.scopes?.includes("read:jira-work"))
        .map((s) => ({ id: s.id, name: s.name, url: s.url })),
    };
  const site = sites.find(
    (s) => s.id === input.cloudId && s.scopes?.includes("read:jira-work"),
  );
  if (!site || !/^[-a-zA-Z0-9]+$/.test(site.id))
    throw Error("Select an authorized Jira site.");
  const base = `https://api.atlassian.com/ex/jira/${site.id}/rest/api/3`;
  const get = (path) => call(base + path, token);
  const project = String(input.projectKey || "");
  if (action === "projects") {
    const data = await get("/project/search?maxResults=100");
    return {
      projects: (data.values || []).map((p) => ({
        id: p.id,
        key: p.key,
        name: p.name,
      })),
      truncated: !data.isLast,
    };
  }
  if (action === "types") {
    if (!/^[A-Z][A-Z0-9_]{0,49}$/.test(project))
      throw Error("Select a Jira project.");
    const data = await get(
      `/issue/createmeta/${project}/issuetypes?maxResults=100`,
    );
    return {
      types: (data.issueTypes || data.values || [])
        .filter((t) => !t.subtask)
        .map((t) => ({ id: t.id, name: t.name })),
    };
  }
  if (action === "import") {
    const keys = String(input.keys || "")
      .toUpperCase()
      .split(/[\s,]+/)
      .filter(Boolean);
    if (
      !keys.length ||
      keys.length > 10 ||
      keys.some((k) => !/^([A-Z][A-Z0-9_]{0,49})-\d+$/.test(k))
    )
      throw Error("Enter up to 10 Jira issue keys, separated by commas.");
    const issues = [];
    for (const key of keys) {
      const d = await get(
        `/issue/${key}?fields=summary,description,status,updated,issuetype`,
      );
      issues.push({
        key: d.key,
        title: d.fields.summary,
        text: adfText(d.fields.description),
        status: d.fields.status?.name,
        updated: d.fields.updated,
        url: site.url + "/browse/" + d.key,
      });
    }
    return { issues };
  }
  async function existing(marker) {
    const d = await call(base + "/search/jql", token, {
      method: "POST",
      body: JSON.stringify({
        jql: `labels = "${marker}"`,
        fields: ["summary", "description", "updated"],
        maxResults: 2,
      }),
    });
    if (d.issues?.length > 1)
      throw Error(
        "Multiple Jira issues match this item. Reconcile the duplicates in Jira first.",
      );
    return d.issues?.[0];
  }
  if (action === "prepare") {
    if (
      !/^[A-Z][A-Z0-9_]{0,49}$/.test(project) ||
      !/^\d+$/.test(String(input.issueType))
    )
      throw Error("Select a project and issue type.");
    if (
      !input.summary?.trim() ||
      input.summary.length > 255 ||
      typeof input.description !== "string" ||
      input.description.length > 20000
    )
      throw Error(
        "Use a title under 255 characters and description under 20,000 characters.",
      );
    if (
      ![input.projectId, input.nodeId, input.itemId].every(
        (x) => typeof x === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(x),
      )
    )
      throw Error("Invalid local item identifier.");
    const metadata = await get(
      `/issue/createmeta/${project}/issuetypes/${input.issueType}?maxResults=200`,
    );
    const fields = metadata.fields || metadata.values || [];
    const missing = fields.filter(
      (f) =>
        f.required &&
        !f.hasDefaultValue &&
        !["summary", "description", "project", "issuetype", "labels"].includes(
          f.fieldId || f.key,
        ),
    );
    if (missing.length)
      throw Error(
        "This issue type requires " +
          missing.map((f) => f.name).join(", ") +
          ". Use Jira directly or choose an issue type with supported fields.",
      );
    if (!fields.some((f) => (f.fieldId || f.key) === "labels"))
      throw Error(
        "Enable Labels on this Jira issue type so exported items can be reconciled safely.",
      );
    const marker = jiraMarker(input.projectId, input.nodeId, input.itemId),
      old = await existing(marker);
    if (old && old.key.split("-").slice(0, -1).join("-") !== project)
      throw Error(
        "This item was already exported to another project. Review it in Jira first.",
      );
    const preview = {
      mode: old ? "update" : "create",
      key: old?.key || null,
      projectKey: project,
      issueType: input.issueType,
      summary: input.summary,
      description: input.description,
      previous: old
        ? {
            summary: old.fields.summary,
            description: adfText(old.fields.description),
          }
        : null,
    };
    const plan = {
      provider,
      cloudId: site.id,
      actor: identity(token),
      marker,
      project,
      issueType: input.issueType,
      summary: input.summary,
      description: input.description,
      key: old?.key || null,
      updated: old?.fields.updated || null,
      exp: Date.now() + 300000,
    };
    // Full descriptions exceed cookie-sized envelopes, so sign a digest and reconstruct on publish.
    const digest = createHash("sha256")
      .update(JSON.stringify(plan))
      .digest("hex");
    return { preview, plan, proof: seal({ digest, exp: plan.exp }) };
  }
  if (action === "publish") {
    const plan = input.plan,
      proof = unseal(input.proof);
    if (
      !plan ||
      !proof ||
      plan.exp < Date.now() ||
      proof.digest !==
        createHash("sha256").update(JSON.stringify(plan)).digest("hex") ||
      plan.actor !== identity(token) ||
      plan.cloudId !== site.id
    )
      throw Error("The preview expired or changed. Preview this item again.");
    const old = await existing(plan.marker);
    if (!plan.key && old)
      return {
        key: old.key,
        url: site.url + "/browse/" + old.key,
        reconciled: true,
      };
    if (
      plan.key &&
      (!old || old.key !== plan.key || old.fields.updated !== plan.updated)
    )
      throw Error(
        "This issue changed in Jira since your preview. Preview again before updating.",
      );
    const fields = {
      summary: plan.summary,
      description: toAdf(plan.description),
    };
    let key = plan.key;
    if (key)
      await call(base + "/issue/" + encodeURIComponent(key), token, {
        method: "PUT",
        body: JSON.stringify({ fields }),
      });
    else {
      const d = await call(base + "/issue", token, {
        method: "POST",
        body: JSON.stringify({
          fields: {
            ...fields,
            project: { key: plan.project },
            issuetype: { id: plan.issueType },
            labels: [plan.marker],
          },
        }),
      });
      key = d.key;
    }
    return { key, url: site.url + "/browse/" + key, reconciled: false };
  }
  throw Error("Unsupported connector operation.");
}
