import { renderCards } from "./render.js";

const get = id => document.getElementById(id);
async function read(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error("無法取得課程資料");
  return response.json();
}

async function load() {
  const units = await read("./units/index.json");
  const requested = Number(new URL(location.href).searchParams.get("unit"));
  const unit = units.includes(requested) ? requested : units[0];
  for (const number of units) {
    const link = document.createElement("a");
    link.href = "?unit=" + number;
    link.textContent = "第 " + number + " 課";
    if (number === unit) link.setAttribute("aria-current", "page");
    get("units").append(link);
  }
  const lesson = await read("./units/u" + unit + ".json");
  get("number").textContent = "UNIT " + String(unit).padStart(2, "0");
  get("title").textContent = lesson.title;
  renderCards(get("word-list"), lesson.words);
  renderCards(get("grammar-list"), lesson.grammar, true);
  get("lesson").hidden = false;
  get("status").textContent = "";
}
load().catch(() => { get("status").textContent = "課程載入失敗，請重新整理。"; });
