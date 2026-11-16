# 國一英語複習網站

讀者是國一學生。公開頁依課次呈現單字、文法，採暖白背景、深藍文字、行動優先排版及清楚的鍵盤焦點。

每課存放在 docs/units/uN.json，N 為正整數。docs/units/index.json 是按課號排序的數字陣列。資料格式如下。

```json
{"unit":1,"title":"Who’s That Handsome Boy?","words":[{"word":"handsome","pos":"adj.","meaning":"英俊的","example":"The prince looks handsome.","translation":"王子看起來很英俊。"}],"grammar":[{"id":"who","title":"Who 問句","pattern":"Who + be + 主詞?","tip":"依主詞選用 is 或 are。","example":"Who is that girl?","translation":"那個女孩是誰？"}]}
```

單字以忽略大小寫的詞頭與詞性為合併依據，文法以固定 id 為依據。保留未選取的既有條目。繁體中文解釋配原創英文例句與翻譯。公開連結使用相對路徑，動態文字用 textContent 呈現。

管理頁、模型和草稿留在本機作業。只提交原始碼與審閱後的複習資料。公開資料禁止包含原始教材、擷取文字、憑證和本機路徑。修改後執行 npm test，並試開桌面與手機版。用假資料驗證新課與合併，發布前檢查 Git 差異。
