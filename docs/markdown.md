---
title: "MDGarden - Plug-ins"
lastModified: "2026-03-06T00:40:00+09:00"
indexing: true
---

# Markdown + Plugin Extension Sample

このファイルは、標準 Markdown と MDView 拡張（プラグイン）を確認するためのサンプルです。

toc{.toc}

---

## 1. 見出し

# H1
## H2
### H3
#### H4
##### H5
###### H6

## 2. 強調

- **太字**
- *斜体*
- ~~打ち消し線~~
- `インラインコード`

## 3. リスト

- 箇条書き 1
- 箇条書き 2
  - ネスト 2-1

1. 番号付き 1
2. 番号付き 2
3. 番号付き 3

- [x] タスク完了
- [ ] タスク未完了

## 4. 引用

> これは引用です。  
> 複数行の引用にも対応します。

## 5. 水平線

---

## 6. リンクと画像

- [内部リンク（index.md）](index.md)
- [外部リンク（OpenAI）](https://openai.com){.external}

![サンプル画像](https://picsum.photos/480/160)

## 7. テーブル

| 項目 | 値 | メモ |
|---|---:|---|
| A | 10 | left |
| B | 20 | center |
| C | 30 | right |

## 8. コードブロック（標準）

```text
plain text block
```

```js
const greet = (name) => `Hello, ${name}`;
console.log(greet("MDView"));
```

```bash
echo "markdown sample"
```

```json
{
  "name": "mdview",
  "type": "sample"
}
```

## 9. 脚注（footnote）

脚注の例です[^1]。もう1つ[^longnote]。

[^1]: これは短い脚注です。
[^longnote]: これは長めの脚注です。Markdown-it footnote 拡張で表示されます。

## 10. 属性拡張（markdown-it-attrs）

この段落はクラス指定の例です。{.note}

## 11. Plugin: Highlight

`highlight` プラグインでコードハイライトと行番号を確認できます。

```js
function sum(a, b) {
  return a + b;
}
```

## 12. Plugin: Math

```math
\[
\int_0^1 x^2 dx = \frac{1}{3}
\]
```

## 13. Plugin: Graph (c3)

```graph
{
  "data": {
    "columns": [
      ["data1", 30, 200, 100, 400, 150, 250],
      ["data2", 50, 20, 10, 40, 15, 25]
    ]
  }
}
```

## 14. Plugin: Chart (Mermaid)

```chart
graph TD
  A[Markdown] --> B[MDView]
  B --> C[Plugins]
  C --> D[Rendered]
```

## 15. 相対リンク挙動の確認

- [同階層リンク](index.md)
- [親階層リンク](../index.md)
- [カテゴリリンク](notes/index.md)
