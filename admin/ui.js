import { renderCards } from "/render.js";
import { key, merge, sections, validateContent } from "/admin/content.mjs";

const get = id => document.getElementById(id);
const status = get("status");
const labels = { word: "單字", pos: "詞性", meaning: "中文釋義", id: "文法識別碼", title: "文法標題", pattern: "句型", tip: "重點", example: "英文例句", translation: "中文翻譯" };
let base;
let entries;
let approval;
let busy = false;

async function api(path, options) {
  const response = await fetch(path, options);
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error), { result });
  return result;
}

function node(tag, text) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  return element;
}

function invalidate() {
  get("review").hidden = true;
  approval = undefined;
}

function card(section, entry, seen) {
  const id = key(section, entry);
  const existing = base[section].find(item => key(section, item) === id);
  const duplicate = seen.has(id);
  seen.add(id);
  const same = existing && JSON.stringify(existing) === JSON.stringify(entry);
  const article = node("article");
  article.className = "card";
  const choice = node("label");
  const checkbox = node("input");
  checkbox.type = "checkbox";
  checkbox.checked = !existing && !duplicate;
  choice.append(checkbox, duplicate ? " 本批次重複" : same ? " 與既有內容相同" : existing ? " 與既有內容有差異" : " 新增條目");
  article.append(choice, node("h4", entry.word || entry.title));
  if (existing) {
    const details = node("details");
    const previous = node("div");
    renderCards(previous, [existing], section === "grammar");
    details.append(node("summary", "查看原內容"), previous);
    article.append(details);
  }
  const inputs = Object.entries(entry).map(([field, value]) => {
    const label = node("label", labels[field] || field);
    const input = node(value.length > 60 ? "textarea" : "input");
    input.value = value;
    input.maxLength = 1200;
    label.append(input);
    article.append(label);
    return [field, input];
  });
  article.addEventListener("input", invalidate);
  get(section).append(article);
  return { checkbox, inputs };
}

async function loadUnits() {
  const units = await api("/units/index.json");
  const select = get("units");
  const selected = select.value;
  select.replaceChildren(...units.map(unit => new Option("第 " + unit + " 課", unit)), new Option("建立新課", "new"));
  if ([...select.options].some(option => option.value === selected)) select.value = selected;
  get("new-unit").hidden = select.value !== "new";
}

function newTask(task) {
  return async event => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    const buttons = [...document.querySelectorAll("button")];
    buttons.forEach(button => { button.disabled = true; });
    try { await task(); }
    catch (error) {
      status.textContent = error.result?.pending
        ? (error.result.pushed ? "已推送，部署尚未驗證。 " : "已保留核准版本，推送待重試。 ") + error.message
        : error.message;
      if (error.result?.pending) get("retry").hidden = false;
    } finally {
      buttons.forEach(button => { button.disabled = false; });
      busy = false;
    }
  };
}

get("units").addEventListener("change", () => {
  get("new-unit").hidden = get("units").value !== "new";
});
get("import").addEventListener("submit", newTask(async () => {
  const newUnit = get("units").value === "new";
  const unit = Number(get(newUnit ? "number" : "units").value);
  const files = [...get("files").files];
  const draft = { words: [], grammar: [] };
  const initial = await api("/api/unit?unit=" + unit);
  if (newUnit && initial.title) throw new Error("這個課號已存在，請從清單選取。");
  for (const file of files) {
    if (file.size > 25 * 1024 * 1024) throw new Error("超過 25 MB：" + file.name);
    status.textContent = "正在整理 " + file.name + "…";
    const params = new URLSearchParams({ unit, name: file.name });
    const result = await api("/api/import?" + params, { method: "POST", body: file });
    if (JSON.stringify(result.base) !== JSON.stringify(initial)) throw new Error("課程已更新，請重試。");
    for (const section of sections) draft[section].push(...result.draft[section]);
  }
  if (!draft.words.length && !draft.grammar.length) throw new Error("教材中未找到可整理的單字或文法。");
  invalidate();
  base = initial;
  entries = Object.fromEntries(sections.map(section => {
    get(section).replaceChildren();
    const seen = new Set();
    return [section, draft[section].map(entry => card(section, entry, seen))];
  }));
  get("title").value = base.title;
  get("editor").hidden = false;
  status.textContent = "整理完成。請審閱第 " + unit + " 課草稿。";
}));
get("title").addEventListener("input", invalidate);
get("preview").addEventListener("click", newTask(async () => {
  const title = get("title").value.trim();
  if (!title) throw new Error("請填寫課名。");
  const chosen = validateContent(Object.fromEntries(sections.map(section => [
    section, entries[section].filter(entry => entry.checkbox.checked).map(entry =>
      Object.fromEntries(entry.inputs.map(([field, input]) => [field, input.value])))
  ])));
  if (!chosen.words.length && !chosen.grammar.length) throw new Error("請勾選至少一筆要發布的條目。");
  const combined = merge(base, chosen);
  approval = { unit: base.unit, base, title, chosen };
  get("preview-title").textContent = title;
  renderCards(get("preview-words"), combined.words);
  renderCards(get("preview-grammar"), combined.grammar, true);
  get("review").hidden = false;
  get("review").scrollIntoView();
  status.textContent = "已產生預覽，請確認合併結果。";
}));

function showDeployment(result) {
  get("retry").hidden = result.deployed;
  if (result.deployed) {
    const link = node("a", "開啟公開網站");
    link.href = result.url;
    status.replaceChildren("公開網站已更新。 ", link);
  } else status.textContent = "已推送。GitHub Pages 尚在部署，請稍後檢查。";
}

get("publish").addEventListener("click", newTask(async () => {
  if (!approval) return;
  status.textContent = "正在提交、推送並驗證部署…";
  const result = await api("/api/publish", { method: "POST", body: JSON.stringify(approval) });
  showDeployment(result);
  get("editor").hidden = true;
  invalidate();
  await loadUnits();
}));
get("retry").addEventListener("click", newTask(async () => {
  status.textContent = "正在重試發布或檢查部署…";
  showDeployment(await api("/api/retry", { method: "POST" }));
  get("editor").hidden = true;
  invalidate();
  await loadUnits();
}));

Promise.all([loadUnits(), api("/api/pending")]).then(([, job]) => {
  get("retry").hidden = !job.pending;
  if (job.pending) status.textContent = job.pushed ? "有待驗證的部署。" : "有待推送的核准版本。";
}).catch(error => { status.textContent = error.message; });
