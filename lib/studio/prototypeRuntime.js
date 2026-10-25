import { validatePrototype } from "./prototype.js";
import { PROTOTYPE_CSS } from "./prototypeStyles.js";
import { preparePrototypeData } from "./prototype-data.js";
export { PROTOTYPE_CSS } from "./prototypeStyles.js";
// Keep self-contained: this trusted function is also embedded in the offline HTML export.
export function prototypeRuntime(spec, initialScreen, failMode) {
  const root = document.getElementById("prototype-root");
  window.addEventListener("message", event => {
    if (event.source !== window.parent) return;
    if (event.data?.type === "stockedby-prototype-navigate") {
      if (spec.screens.some(s => s.id === event.data.screenId)) go(event.data.screenId);
      return;
    }
    if (event.data?.type !== "stockedby-prototype-failure" || typeof event.data.enabled !== "boolean") return;
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
  document.body.className = spec.layout + (spec.targetPlatform === "tablet" ? " target-tablet" : "");
  let screen =
    spec.screens.find((s) => s.id === initialScreen)?.id || spec.startScreenId;
  let collections = {}, drafts = Object.create(null), history = [], nextRecord = 0;
  const personal = new Set(spec.personalCollections || []);
  const compactQuery = window.matchMedia("(max-width:600px)");
  const compact = () => spec.layout === "mobile" || compactQuery.matches;
  compactQuery.addEventListener("change", () => render());
  function captureDrafts() {
    root.querySelectorAll("form[data-draft]").forEach(form => {
      const values = Object.create(null);
      form.querySelectorAll("input,textarea,select").forEach(input => { values[input.name] = input.type === "checkbox" ? input.checked ? "Yes" : "" : input.value; });
      drafts[form.dataset.draft] = values;
    });
  }
  function init() {
    collections = Object.create(null);
    for (const s of spec.screens)
      for (const b of s.sections)
        if (b.collection && b.type !== "summary") {
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
    if (!spec.screens.some((s) => s.id === id)) return;
    if (id !== screen) { history.push(screen); screen = id; }
    render();
  }
  function act(a, row, form) {
    if (a.kind === "navigate") {
      go(a.targetScreenId);
      return;
    }
    if (a.kind === "reset") {
      init(); drafts = Object.create(null); history = [];
      root.replaceChildren(); screen = spec.startScreenId; render();
      tell(spec.dataScope === "personal" ? "Your entries are cleared. Start a new application." : "Prototype reset to its sample data.");
      return;
    }
    if (["submit", "continue"].includes(a.kind)) {
      if (!form) return;
      captureDrafts();
      // A direct jump to a confirmation must not bypass the application forms.
      if (spec.dataScope === "personal") {
        const page = spec.screens.find(s => s.id === screen);
        const reviewing = new Set(page.sections.filter(b => ["cards", "table"].includes(b.type) && personal.has(b.collection)).map(b => b.collection));
        for (const source of spec.screens) for (const section of source.sections) {
          if (section.type !== "form") continue;
          if (!section.actions.some(action => reviewing.has(action.collection))) continue;
          for (const field of section.fields) {
            const value = savedFieldValue({page:source, section, field});
            const error = validateValue(field, value);
            if (error) { go(source.id); tell(field.label + ": " + error); return; }
          }
        }
      }
      if (form.dataset.summary) {
        for (const ref of JSON.parse(form.dataset.summary)) {
          const source = findField(ref); if (!source) return;
          const value = savedFieldValue(source);
          const error = validateValue(source.field, value);
          if (error) { go(source.page.id); tell(source.field.label + ": " + error); return; }
        }
      }
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
        const error = validateValue(input, value);
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
      if (failMode && a.kind === "submit") {
        const msg = el(
          "p",
          "error",
          "Simulated service failure. Nothing was saved. Turn off failure mode and retry; your entries are kept.",
        );
        msg.setAttribute("role", "alert");
        form.append(msg);
        return;
      }
      if (a.collection && a.kind === "submit") {
        const previous = personal.has(a.collection) ? collections[a.collection]?.[0] : null;
        // Intermediate Continue actions only keep drafts. Include their entered
        // fields when this personal application is eventually submitted.
        const entered = Object.create(null);
        if (personal.has(a.collection)) for (const page of spec.screens) for (const section of page.sections) {
          if (section.type === "form" && section.actions.some(action => action.collection === a.collection))
            Object.assign(entered, drafts[page.id + ":" + section.id]);
        }
        Object.assign(entered, values);
        const firstForm = spec.screens.flatMap(s => s.sections).find(b => b.type === "form" && b.actions.some(action => action.collection === a.collection));
        const labelField = firstForm?.fields.find(f => f.id === "title")?.id || firstForm?.fields.find(f => ["text","email"].includes(f.type))?.id || firstForm?.fields[0]?.id;
        const record = {
          ...previous,
          ...entered,
          id: previous?.id || "record-" + (++nextRecord),
          title: entered.title || entered[labelField] || previous?.title || Object.values(entered)[0] || "Your application",
          subtitle: Object.hasOwn(entered, "subtitle") ? entered.subtitle :
            previous?.subtitle ||
            Object.entries(entered)
              .filter(([k]) => !["title", "status", "value"].includes(k))
              .map(([, v]) => v)
              .join(" · "),
          status: entered.status || previous?.status || "Created",
          value: Object.hasOwn(entered, "value") ? entered.value : previous?.value || "",
        };
        if (a.field) record[a.field] = a.value;
        if (!collections[a.collection]) collections[a.collection] = [];
        if (personal.has(a.collection)) collections[a.collection] = [record];
        else collections[a.collection].push(record);
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
    if (a.targetScreenId && a.targetScreenId !== screen) { history.push(screen); screen = a.targetScreenId; }
    render();
    if (a.message) tell(a.message);
  }
  function actions(list, row, form) {
    const wrap = el("div", "actions");
    const primary = Math.max(0, list.findIndex(a => ["submit", "continue"].includes(a.kind)));
    for (const [i, a] of list.entries()) {
      const b = el("button", "btn" + (i === primary ? "" : " secondary"), a.label);
      b.type = "button";
      b.onclick = () => act(a, row, form);
      wrap.append(b);
    }
    return wrap;
  }
  function validateValue(field, value) {
    if (field.required && !value) return "Please complete this field.";
    if (value && field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email address.";
    if (value && field.type === "number") {
      if (!Number.isFinite(Number(value))) return "Enter a valid number.";
      if (field.min !== undefined && field.min !== "" && Number(value) < Number(field.min)) return "Enter " + field.min + " or more.";
      if (field.max !== undefined && field.max !== "" && Number(value) > Number(field.max)) return "Enter " + field.max + " or less.";
    }
    return "";
  }
  function findField(ref) {
    for (const page of spec.screens) for (const section of page.sections) for (const field of section.fields) {
      if (`${page.id}.${section.id}.${field.id}` === ref) return {page, section, field};
    }
  }
  function savedFieldValue({page, section, field}) {
    const saved = drafts[page.id + ":" + section.id];
    return saved && Object.hasOwn(saved, field.id) ? saved[field.id] : field.initialValue;
  }
  function summaryValue(record) {
    if (!record.fieldRef) return record.value || record.subtitle;
    const source = findField(record.fieldRef);
    return source ? savedFieldValue(source) || "Not entered" : "Not entered";
  }
  function render() {
    document.querySelector(".toast")?.remove();
    captureDrafts();
    document.body.classList.toggle("compact", compact());
    const s = spec.screens.find((s) => s.id === screen);
    root.replaceChildren();
    const shell = el("div", "shell"),
      nav = el("nav", "nav");
    nav.setAttribute("aria-label", "Prototype screens");
    const brand = el("div", "brand");
    brand.append(el("span", "brandMark", spec.name.slice(0, 1)), el("span", "brandName", spec.name));
    brand.title = spec.name;
    if (compact()) {
      const back = el("button", "navBack", "‹");
      back.type = "button"; back.setAttribute("aria-label", "Go back"); back.disabled = !history.length;
      back.onclick = () => { const previous = history.pop(); if (previous) { screen = previous; render(); } };
      const toggle = el("button", "navMenu", "☰");
      toggle.type = "button"; toggle.setAttribute("aria-label", "All screens"); toggle.setAttribute("aria-expanded", "false"); toggle.setAttribute("aria-controls", "screen-menu");
      const menu = el("div", "screenMenu"); menu.id = "screen-menu"; menu.hidden = true;
      toggle.onclick = () => { menu.hidden = !menu.hidden; toggle.setAttribute("aria-expanded", String(!menu.hidden)); };
      nav.onkeydown = e => { if (e.key === "Escape") { menu.hidden = true; toggle.setAttribute("aria-expanded", "false"); toggle.focus(); } };
      for (const page of spec.screens) {
        const button = el("button", "", page.name); button.type = "button";
        if (page.id === screen) button.setAttribute("aria-current", "page");
        button.onclick = () => go(page.id); menu.append(button);
      }
      nav.append(back, brand, toggle, menu);
    } else {
      nav.append(brand);
      for (const page of spec.screens) {
        const button = el("button", "", page.name); button.type = "button";
        if (page.id === screen) button.setAttribute("aria-current", "page");
        button.onclick = () => go(page.id); nav.append(button);
      }
      nav.append(el("small", "", "Interactive prototype · sample data"));
    }
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
        form.dataset.draft = s.id + ":" + b.id;
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
          const saved = drafts[form.dataset.draft];
          const value = saved && Object.hasOwn(saved,f.id) ? saved[f.id] : f.initialValue;
          input.value = value;
          if (f.type === "checkbox") { input.checked = value === "Yes"; label.classList.add("check"); }
          if (f.type === "number") { input.inputMode = "decimal"; input.step = "any"; if (f.min !== undefined) input.min = f.min; if (f.max !== undefined) input.max = f.max; }
          input.readOnly = !!f.readOnly;
          if (f.readOnly && ["select", "checkbox"].includes(f.type)) input.disabled = true;
          if (f.type === "checkbox") label.prepend(input); else label.append(input);
          if (f.hint) { const hint = el("small", "hint", f.hint); hint.id = input.id + "-hint"; input.setAttribute("aria-describedby",hint.id); label.append(hint); }
          form.append(label);
        }
        form.append(actions(b.actions, null, form));
        form.onsubmit = (e) => {
          e.preventDefault();
          const submit = b.actions.find((a) => ["submit", "continue"].includes(a.kind));
          if (submit) act(submit, null, form);
        };
        sec.append(form);
      } else if (b.type === "summary") {
        sec.classList.add("panel", "summary"); sec.append(el("h2", "", b.title));
        if (b.description) sec.append(el("p", "", b.description));
        const rows = el("dl", "summaryRows");
        for (const r of b.records) { const row = el("div", "summaryRow"); row.append(el("dt", "", r.title), el("dd", "", summaryValue(r))); rows.append(row); }
        sec.append(rows);
        if (b.actions.some(a => a.kind === "submit")) {
          const form = el("form"); form.noValidate = true;
          form.dataset.summary = JSON.stringify(b.records.map(r => r.fieldRef).filter(Boolean));
          form.append(actions(b.actions, null, form));
          form.onsubmit = e => { e.preventDefault(); act(b.actions.find(a => a.kind === "submit"), null, form); };
          sec.append(form);
        } else sec.append(actions(b.actions));
      } else {
        sec.append(el("h2", "", b.title), el("p", "", b.description));
        if (!records.length)
          sec.append(
            el(
              "div",
              "empty",
              personal.has(b.collection) ? "Complete the form to see your details here." : "Nothing here yet. Complete the preceding step to add your first item.",
            ),
          );
        else if (personal.has(b.collection) && ["cards", "table"].includes(b.type)) {
          const item = records[0], card = el("article", "panel currentRecord"), top = el("div", "recordTop");
          top.append(el("strong", "", item.title), el("span", "badge", item.status)); card.append(top);
          const fields = new Map();
          for (const page of spec.screens) for (const section of page.sections) {
            if (section.type === "form" && section.actions.some(a => a.collection === b.collection))
              for (const field of section.fields) fields.set(field.id,field);
          }
          const rows = el("dl", "summaryRows");
          for (const [id,field] of fields) if (Object.hasOwn(item,id) && id !== "title") {
            const row = el("div", "summaryRow"); row.append(el("dt", "", field.label), el("dd", "", item[id] || "Not entered")); rows.append(row);
          }
          card.append(rows,actions(b.actions,item)); sec.append(card);
        } else if (b.type === "table" && compact()) {
          const cards = el("div", "tableCards");
          for (const r of records) {
            const card = el("article", "card"), top = el("div", "recordTop");
            top.append(el("strong", "", r.title), el("span", "badge", r.status));
            card.append(top, el("p", "", r.subtitle)); if (r.value) card.append(el("p", "", r.value));
            card.append(actions(b.actions,r)); cards.append(card);
          }
          sec.append(cards);
        } else if (b.type === "table") {
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
    main.append(el("p", "simulation", "Prototype · sample data"));
    if (compact()) {
      const forms = main.querySelectorAll("form");
      // One anchored action group per screen, with its real form handler intact.
      let dock = forms.length === 1 ? forms[0].querySelector(".actions") : forms.length === 0 ? main.querySelector(".heading .actions:not(:empty),.hero .actions:not(:empty),.summary .actions:not(:empty)") : null;
      if (dock?.children.length) { dock.classList.add("dock"); main.classList.add("hasDock"); }
    }
    shell.append(nav, main);
    root.append(shell);
    if (history.length) { const title = main.querySelector("h1"); title.tabIndex = -1; title.focus({preventScroll:true}); }
    window.scrollTo(0,0);
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
  spec = preparePrototypeData(spec);
  const data = JSON.stringify(spec)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  const start = JSON.stringify(screenId).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-src 'none'; object-src 'none'"><title>${escapeHtml(spec.name)} — interactive prototype</title><style>${PROTOTYPE_CSS}</style></head><body><div id="prototype-root"></div><script>(${prototypeRuntime.toString()})(${data},${start},${Boolean(failure)});</script></body></html>`;
}
export function screenSvg(spec, screenId) {
  spec = preparePrototypeData(spec);
  const s = spec.screens.find((s) => s.id === screenId) || spec.screens[0],
    w = spec.targetPlatform === "tablet" ? 820 : spec.layout === "mobile" ? 390 : 1100;
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
