import { validatePrototype } from "./prototype.js";
export const PROTOTYPE_CSS = `*{box-sizing:border-box}body{margin:0;font:14px/1.6 system-ui,sans-serif;color:#1e293b;background:#f5f6fa}button,input,select,textarea{font:inherit}button{cursor:pointer}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid #99adff;outline-offset:3px}.shell{display:flex;min-height:100vh}.nav{width:208px;flex-shrink:0;background:#171e33;color:#fff;padding:28px 16px;display:flex;flex-direction:column;gap:6px}.brand{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:750;font-size:24px;letter-spacing:-1px;padding:0 12px 30px}.brand span{display:inline-grid;place-items:center;background:var(--accent);width:32px;height:32px;border-radius:10px;margin-right:9px;color:white}.nav button{border:0;color:#bdc4d9;background:none;text-align:left;padding:11px 13px;border-radius:7px}.nav button[aria-current=page]{color:#fff;background:#ffffff18}.nav small{margin-top:auto;padding:25px 12px;color:#b4bdd2;font-size:10px}.main{flex:1;min-width:0;padding:0 38px 35px;max-width:1300px}.top{height:68px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e3e7ef;color:#68738d;font-size:12px;margin-bottom:34px}.avatar{width:30px;height:30px;display:grid;place-items:center;background:#e6eafa;color:#45578a;border-radius:50%;font-size:11px}.heading{display:flex;align-items:flex-end;gap:20px;justify-content:space-between;margin-bottom:30px}.eyebrow{font-size:10px;font-weight:700;letter-spacing:1.8px;color:var(--accent)}h1{font-size:clamp(26px,3.6vw,42px);line-height:1.15;letter-spacing:-1.7px;margin:12px 0 16px;max-width:750px}p{color:#68738a;margin:8px 0}h2{font-size:17px;letter-spacing:-.4px;margin:0 0 8px}.desc{max-width:650px}.section{margin:24px 0}.panel{border:1px solid #e0e5ef;border-radius:12px;background:#fff;padding:24px}.hero{position:relative;padding:35px;border-radius:16px;background:var(--tint);border:1px solid #dce1ef;overflow:hidden}.hero h2{font-size:29px;letter-spacing:-1px;max-width:500px}.hero p{max-width:500px}.hero:after{content:'↗';position:absolute;right:30px;top:-15px;font-size:150px;line-height:1.3;opacity:.1;color:var(--accent);pointer-events:none}.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}.btn{background:var(--accent);color:white;border:1px solid transparent;padding:10px 16px;border-radius:7px;font-weight:600;font-size:12px}.btn.secondary{background:#fff;color:#354460;border-color:#dce2ec}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px}.card{background:#fff;padding:22px;border:1px solid #e0e5ef;border-radius:12px;min-width:0;overflow-wrap:anywhere}.card h3{margin:8px 0;font-size:16px}.card .value{font-size:32px;font-weight:650;letter-spacing:-1px;color:#243047}.badge{display:inline-block;background:#eff2f8;color:#52617c;padding:3px 8px;border-radius:20px;font-size:10px}.table{width:100%;border-collapse:collapse}.table td,.table th{text-align:left;padding:16px;border-bottom:1px solid #e8edf4;font-size:12px}.table th{color:#6b7890;font-size:10px;text-transform:uppercase;letter-spacing:1px}.table td small{display:block;color:#728098;max-width:300px}.table .actions{margin:0}.tableWrap{overflow:auto}.form{max-width:620px}.field{display:block;margin:18px 0;color:#34405a;font-size:12px;font-weight:600}.field input:not([type=checkbox]),.field textarea,.field select{display:block;width:100%;border:1px solid #cfd7e5;background:#fff;border-radius:6px;padding:11px 12px;margin-top:7px;color:#27334c}.field textarea{min-height:95px;resize:vertical}.field input[type=checkbox]{margin-right:9px}.error{display:block;color:#ad3f48;font-size:12px;margin-top:7px}.notice{border-left:3px solid var(--accent);padding:18px 22px;background:var(--tint);border-radius:6px}.empty{padding:45px;text-align:center;color:#758098;border:1px dashed #cdd5e2;border-radius:10px}.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);max-width:90vw;padding:14px 22px;background:#1e2b45;color:white;border-radius:8px;box-shadow:0 6px 25px #0002;z-index:10;font-size:12px}.topbar .shell{display:block}.topbar .nav{width:100%;flex-direction:row;align-items:center;padding:16px 28px;flex-wrap:wrap}.topbar .brand{padding:0;margin-right:auto}.topbar .nav small{display:none}.topbar .main{margin:auto}.mobile .shell{display:block;max-width:480px;margin:auto;background:white;min-height:100vh}.mobile .nav{width:100%;flex-direction:row;flex-wrap:wrap;padding:16px;gap:3px}.mobile .nav .brand{width:100%;padding-bottom:12px}.mobile .nav small{display:none}.mobile .nav button{font-size:11px;padding:7px 9px}.mobile .main{padding:0 22px 30px}.mobile .heading{display:block}.mobile .hero{padding:24px}.mobile .hero:after{display:none}.mobile .hero h2{font-size:24px}.mobile .grid{grid-template-columns:1fr}@media(max-width:600px){.shell{display:block}.nav{width:100%;flex-direction:row;flex-wrap:wrap;padding:18px}.nav .brand{width:100%;padding:0 0 12px}.nav button{font-size:11px;padding:7px 10px}.nav small{display:none}.main{padding:0 22px 30px}.heading{display:block}.hero{padding:25px}.hero:after{display:none}.hero h2{font-size:25px}.table td,.table th{padding:10px}.top{margin-bottom:26px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}`;
// Keep self-contained: this trusted function is also embedded in the offline HTML export.
export function prototypeRuntime(spec, initialScreen, failMode) {
  const root = document.getElementById("prototype-root");
  window.addEventListener("message", event => {
    if (event.source !== window.parent || event.data?.type !== "stockedby-prototype-failure" || typeof event.data.enabled !== "boolean") return;
    failMode = event.data.enabled;
    // Do not rerender: doing so discards unsaved form values.
    document.querySelectorAll('[data-failure-notice]').forEach(section => { section.hidden = !failMode; });
  });
  const colors = {
    indigo: ["#4d5fd6", "#eef0ff"],
    emerald: ["#15735b", "#eaf6ef"],
    slate: ["#334155", "#edf1f6"],
    rose: ["#a64464", "#fbeef2"],
  };
  document.documentElement.style.setProperty("--accent", colors[spec.theme][0]);
  document.documentElement.style.setProperty("--tint", colors[spec.theme][1]);
  document.body.className = spec.layout;
  let screen =
    spec.screens.find((s) => s.id === initialScreen)?.id || spec.startScreenId;
  let collections = {};
  function init() {
    collections = Object.create(null);
    for (const s of spec.screens)
      for (const b of s.sections)
        if (b.collection) {
          if (!collections[b.collection]) collections[b.collection] = [];
          for (const r of b.records)
            if (!collections[b.collection].some((x) => x.id === r.id))
              collections[b.collection].push({ ...r });
        }
  }
  init();
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = String(text);
    return e;
  }
  function tell(message) {
    document.querySelector(".toast")?.remove();
    const t = el("div", "toast", message);
    t.setAttribute("role", "status");
    document.body.append(t);
    setTimeout(() => t.remove(), 4500);
  }
  function go(id) {
    if (spec.screens.some((s) => s.id === id)) screen = id;
    render();
  }
  function act(a, row, form) {
    if (a.kind === "navigate") {
      go(a.targetScreenId);
      return;
    }
    if (a.kind === "reset") {
      init();
      go(spec.startScreenId);
      tell("Prototype reset to its sample data.");
      return;
    }
    if (a.kind === "submit") {
      if (!form) return;
      form.querySelectorAll(".error").forEach((e) => e.remove());
      let valid = true;
      const values = Object.create(null);
      form.querySelectorAll("input,textarea,select").forEach((input) => {
        const value =
          input.type === "checkbox"
            ? input.checked
              ? "Yes"
              : ""
            : input.value.trim();
        values[input.name] = value;
        let error = "";
        if (input.required && !value) error = "Please complete this field.";
        else if (
          value &&
          input.type === "email" &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        )
          error = "Enter a valid email address.";
        else if (
          value &&
          input.type === "number" &&
          !Number.isFinite(Number(value))
        )
          error = "Enter a valid number.";
        input.setAttribute("aria-invalid", error ? "true" : "false");
        if (error) {
          valid = false;
          const msg = el("span", "error", error);
          msg.id = "error-" + input.id;
          input.setAttribute("aria-describedby", msg.id);
          input.parentElement.append(msg);
        } else input.removeAttribute("aria-describedby");
      });
      if (!valid) {
        form.querySelector("[aria-invalid=true]")?.focus();
        return;
      }
      if (failMode) {
        const msg = el(
          "p",
          "error",
          "Simulated service failure. Nothing was saved. Turn off failure mode and retry; your entries are kept.",
        );
        msg.setAttribute("role", "alert");
        form.append(msg);
        return;
      }
      if (a.collection) {
        const record = {
          ...values,
          id: "record-" + Date.now(),
          title: values.title || Object.values(values)[0] || "New record",
          subtitle:
            values.subtitle ||
            Object.entries(values)
              .filter(([k]) => !["title", "status", "value"].includes(k))
              .map(([, v]) => v)
              .join(" · "),
          status: values.status || "Created",
          value: values.value || "",
        };
        if (a.field) record[a.field] = a.value;
        if (!collections[a.collection]) collections[a.collection] = [];
        collections[a.collection].push(record);
      }
    } else if (a.collection) {
      const records = collections[a.collection] || [],
        id = row?.id || a.recordId;
      if (!id || !records.some(r => r.id === id)) {
        tell("This action needs a selected record. No changes were made.");
        return;
      }
      if (a.kind === "remove")
        collections[a.collection] = records.filter((r) => r.id !== id);
      else if (a.kind === "update")
        collections[a.collection] = records.map((r) =>
          r.id === id ? { ...r, [a.field]: a.value } : r,
        );
    }
    if (a.targetScreenId) screen = a.targetScreenId;
    render();
    if (a.message) tell(a.message);
  }
  function actions(list, row, form) {
    const wrap = el("div", "actions");
    for (const [i, a] of list.entries()) {
      const b = el("button", "btn" + (i ? " secondary" : ""), a.label);
      b.type = "button";
      b.onclick = () => act(a, row, form);
      wrap.append(b);
    }
    return wrap;
  }
  function render() {
    const s = spec.screens.find((s) => s.id === screen);
    root.replaceChildren();
    const shell = el("div", "shell"),
      nav = el("nav", "nav");
    nav.setAttribute("aria-label", "Prototype screens");
    const brand = el("div", "brand");
    brand.append(
      el("span", "", spec.name.slice(0, 1)),
      document.createTextNode(spec.name),
    );
    brand.title = spec.name;
    nav.append(brand);
    for (const page of spec.screens) {
      const b = el("button", "", page.name);
      b.type = "button";
      if (page.id === screen) b.setAttribute("aria-current", "page");
      b.onclick = () => go(page.id);
      nav.append(b);
    }
    nav.append(el("small", "", "Interactive prototype · fictional data"));
    const main = el("main", "main"),
      top = el("div", "top");
    top.append(
      el("span", "", spec.name + " / " + s.name),
      el("span", "avatar", "PM"),
    );
    main.append(top);
    const heading = el("div", "heading"),
      intro = el("div");
    intro.append(
      el("span", "eyebrow", s.eyebrow),
      el("h1", "", s.title),
      el("p", "desc", s.description),
    );
    heading.append(intro, actions(s.actions));
    main.append(heading);
    for (const b of s.sections) {
      const sec = el("section", "section");
      const records = b.collection
        ? collections[b.collection] || []
        : b.records;
      if (
        (b.visibility === "empty" && records.length) ||
        (b.visibility === "nonempty" && !records.length)
      )
        continue;
      if (b.visibility === "failure") { sec.dataset.failureNotice = "true"; sec.hidden = !failMode; }
      if (b.type === "hero" || b.type === "notice") {
        sec.classList.add(b.type);
        sec.append(
          el("h2", "", b.title),
          el("p", "", b.description),
          actions(b.actions),
        );
      } else if (b.type === "form") {
        sec.classList.add("panel", "form");
        sec.append(el("h2", "", b.title), el("p", "", b.description));
        const form = el("form");
        form.noValidate = true;
        for (const f of b.fields) {
          const label = el(
            "label",
            "field",
            f.label + (f.required ? " *" : ""),
          );
          const input = el(
            f.type === "textarea"
              ? "textarea"
              : f.type === "select"
                ? "select"
                : "input",
          );
          input.id = b.id + "-" + f.id;
          input.setAttribute("aria-label", f.label);
          input.name = f.id;
          if (input.tagName === "INPUT") input.type = f.type;
          if (f.type === "select") {
            const blank = el("option", "", f.placeholder || "Select");
            blank.value = "";
            input.append(blank);
            for (const o of f.options) {
              const opt = el("option", "", o);
              opt.value = o;
              input.append(opt);
            }
          }
          input.required = f.required;
          input.placeholder = f.placeholder;
          input.value = f.initialValue;
          if (f.type === "checkbox") input.checked = f.initialValue === "Yes";
          label.append(input);
          form.append(label);
        }
        form.append(actions(b.actions, null, form));
        form.onsubmit = (e) => {
          e.preventDefault();
          const submit = b.actions.find((a) => a.kind === "submit");
          if (submit) act(submit, null, form);
        };
        sec.append(form);
      } else {
        sec.append(el("h2", "", b.title), el("p", "", b.description));
        if (!records.length)
          sec.append(
            el(
              "div",
              "empty",
              "Nothing here yet. Complete the preceding step to add your first item.",
            ),
          );
        else if (b.type === "table") {
          const wrap = el("div", "panel tableWrap"),
            table = el("table", "table"),
            head = el("thead"),
            tr = el("tr");
          ["Name", "Status", "Details", "Actions"].forEach((x) =>
            tr.append(el("th", "", x)),
          );
          head.append(tr);
          table.append(head);
          const body = el("tbody");
          for (const r of records) {
            const row = el("tr"),
              name = el("td");
            name.append(el("strong", "", r.title), el("small", "", r.subtitle));
            const status = el("td");
            status.append(el("span", "badge", r.status));
            const buttons = el("td");
            buttons.append(actions(b.actions, r));
            row.append(name, status, el("td", "", r.value), buttons);
            body.append(row);
          }
          table.append(body);
          wrap.append(table);
          sec.append(wrap);
        } else {
          const grid = el("div", "grid");
          for (const r of records) {
            const card = el("article", "card");
            if (b.type === "metrics") card.append(el("div", "value", r.value));
            else card.append(el("span", "badge", r.status));
            card.append(el("h3", "", r.title), el("p", "", r.subtitle));
            if (b.type !== "metrics" && r.value)
              card.append(el("p", "", r.value));
            card.append(actions(b.actions, r));
            grid.append(card);
          }
          sec.append(grid);
        }
      }
      main.append(sec);
    }
    shell.append(nav, main);
    root.append(shell);
    window.parent.postMessage(
      { type: "stockedby-prototype-screen", screenId: screen },
      "*",
    );
  }
  render();
}
const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function prototypeHtml(spec, { screenId = "", failure = false } = {}) {
  validatePrototype(spec);
  const data = JSON.stringify(spec)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  const start = JSON.stringify(screenId).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-src 'none'; object-src 'none'"><title>${escapeHtml(spec.name)} — interactive prototype</title><style>${PROTOTYPE_CSS}</style></head><body><div id="prototype-root"></div><script>(${prototypeRuntime.toString()})(${data},${start},${Boolean(failure)});</script></body></html>`;
}
export function screenSvg(spec, screenId) {
  const s = spec.screens.find((s) => s.id === screenId) || spec.screens[0],
    w = spec.layout === "mobile" ? 390 : 1100;
  let y = 140;
  const parts = [
    `<rect width="${w}" height="2200" fill="#f5f6fa"/><rect width="${w}" height="66" fill="#171e33"/><text x="28" y="42" fill="#ffffff" font-size="24">${escapeHtml(spec.name)}</text><text x="28" y="110" font-size="26" font-weight="bold">${escapeHtml(s.title)}</text>`,
  ];
  const line = (text, size = 14) => {
    parts.push(
      `<text x="42" y="${y}" font-size="${size}">${escapeHtml(String(text).slice(0, w < 500 ? 42 : 120))}</text>`,
    );
    y += 28;
  };
  for (const b of s.sections) {
    y += 20;
    line(b.title, 20);
    if (b.description) line(b.description.slice(0, w < 500 ? 43 : 100));
    for (const f of b.fields) {
      line(f.label);
      parts.push(
        `<rect x="42" y="${y - 10}" width="${w - 84}" height="38" rx="6" fill="#ffffff" stroke="#cdd5e2"/>`,
      );
      y += 48;
    }
    for (const r of b.records) line(r.title + "  ·  " + r.status);
    for (const a of b.actions) {
      parts.push(
        `<rect x="42" y="${y - 10}" width="${Math.min(w - 84, 230)}" height="40" rx="6" fill="#4d5fd6"/><text x="58" y="${y + 15}" fill="#ffffff" font-size="13">${escapeHtml(a.label)}</text>`,
      );
      y += 56;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${y + 35}" viewBox="0 0 ${w} ${y + 35}" font-family="Arial,sans-serif" fill="#1e293b">${parts.join("")}</svg>`;
}
