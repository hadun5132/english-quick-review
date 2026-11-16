function add(parent, tag, value, className, lang) {
  const element = document.createElement(tag);
  element.textContent = value;
  if (className) element.className = className;
  if (lang) element.lang = lang;
  parent.append(element);
  return element;
}

export function renderCards(container, entries, grammar = false) {
  container.replaceChildren();
  if (!entries.length) add(container, "p", "本課目前沒有條目。");
  for (const entry of entries) {
    const card = add(container, "article", "", "card");
    add(card, "h4", grammar ? entry.title : entry.word, "", grammar ? "" : "en");
    add(card, "p", grammar ? entry.pattern : entry.pos, grammar ? "pattern" : "pos");
    add(card, "p", grammar ? entry.tip : entry.meaning);
    add(card, "p", entry.example, "", "en");
    add(card, "p", entry.translation, "translation");
  }
}
