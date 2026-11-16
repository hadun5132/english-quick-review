const fields = {
  words: ["word", "pos", "meaning", "example", "translation"],
  grammar: ["id", "title", "pattern", "tip", "example", "translation"]
};
export const sections = Object.keys(fields);
export const key = (section, entry) => section === "words"
  ? [entry.word, entry.pos].map(value => value.normalize("NFKC").trim().toLowerCase()).join("\u0000")
  : entry.id;
const shape = Object.fromEntries(sections.map(section => [section, {
  type: "array",
  items: {
    type: "object", additionalProperties: false, required: fields[section],
    properties: Object.fromEntries(fields[section].map(field => [field, { type: "string" }]))
  }
}]));
export const schema = {
  type: "object", additionalProperties: false, required: [...sections, "questions"],
  properties: { ...shape, questions: { type: "array", items: { type: "string" } } }
};

export function validateContent(input, duplicates = false) {
  return Object.fromEntries(sections.map(section => {
    if (!Array.isArray(input?.[section])) throw new Error("單字和文法都必須是清單。");
    const seen = new Set();
    return [section, input[section].map(entry => {
      const normalized = Object.fromEntries(fields[section].map(field => {
        const value = entry?.[field];
        if (typeof value !== "string" || !value.trim() || value.length > 1200 || value.includes("\u0000")) {
          throw new Error("請填寫有效的欄位：" + field);
        }
        return [field, value.trim()];
      }));
      if (section === "grammar" && !/^[a-z][a-z0-9-]{0,63}$/.test(normalized.id)) {
        throw new Error("文法識別碼需為英小寫，可含數字與連字號。");
      }
      const id = key(section, normalized);
      if (seen.has(id) && !duplicates) throw new Error("草稿含有重複條目，請保留一筆。");
      seen.add(id);
      return normalized;
    })];
  }));
}

export function missingChinese(section, entry) {
  const explanation = section === "words" ? entry.meaning : entry.tip;
  return !/\p{Script=Han}/u.test(explanation) || !/\p{Script=Han}/u.test(entry.translation);
}

export function merge(base, chosen) {
  return Object.fromEntries(sections.map(section => {
    const entries = new Map(base[section].map(entry => [key(section, entry), entry]));
    for (const entry of chosen[section]) entries.set(key(section, entry), entry);
    return [section, [...entries.values()]];
  }));
}

export function chunks(pages, limit = 4500) {
  const result = [];
  let pending = "";
  let first;
  let last;
  const flush = () => {
    if (pending) result.push({ text: pending, first, last });
    pending = "";
  };
  for (const [index, page] of pages.entries()) {
    for (const line of page.split(/\r?\n/)) {
      for (let start = 0; start < line.length; start += limit) {
        const part = line.slice(start, start + limit);
        if (!part.trim()) continue;
        if (pending && pending.length + 1 + part.length > limit) flush();
        if (!pending) first = index + 1;
        last = index + 1;
        pending = pending ? pending + "\n" + part : part;
      }
    }
  }
  flush();
  return result;
}
