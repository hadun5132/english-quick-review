import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";
import { chunks, key, merge, validateContent } from "./content.mjs";

const word = { word: "cat", pos: "n.", meaning: "貓", example: "I see a cat.", translation: "我看到一隻貓。" };

test("初版索引和兩課資料符合約定", async () => {
  const read = async path => JSON.parse(await readFile(new URL("../docs/units/" + path, import.meta.url)));
  const units = await read("index.json");
  assert.deepEqual(units, [...new Set(units)].sort((a, b) => a - b));
  assert.ok(units.includes(1) && units.includes(2));
  for (const unit of units) {
    const lesson = await read("u" + unit + ".json");
    assert.equal(lesson.unit, unit);
    assert.doesNotThrow(() => validateContent(lesson));
  }
  for (const [unit, count] of [[1, 29], [2, 36]]) {
    const lesson = await read("u" + unit + ".json");
    assert.equal(lesson.unit, unit);
    assert.ok(lesson.words.length >= count);
    assert.ok(lesson.grammar.length >= 4);
    assert.doesNotThrow(() => validateContent(lesson));
  }
});

test("合併保留原有條目，並以標準化詞頭及詞性更新重複項目", () => {
  const dog = { ...word, word: "dog" };
  const updated = { ...word, word: "ＣＡＴ", meaning: "貓咪" };
  assert.equal(key("words", word), key("words", updated));
  assert.deepEqual(merge({ words: [dog, word], grammar: [] }, { words: [updated], grammar: [] }), {
    words: [dog, updated], grammar: []
  });
  assert.throws(() => validateContent({ words: [word, updated], grammar: [] }), /重複/);
});

test("上傳文字分段保留所有字元", () => {
  assert.deepEqual(chunks(["abcd", "efg", "hijklmn"], 5), ["abcd", "efg", "hijkl", "mn"]);
});
