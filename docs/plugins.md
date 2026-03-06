---
title: "MDGarden - Plug-ins"
lastModified: "2026-03-06T16:10:00+09:00"
indexing: true
---

# Plug-ins
MDGarden は plugin で機能を拡張できます。  
標準の表示機能に加えて、目次・数式・グラフ・編集支援などを必要に応じて追加する設計です。

## 有効化の基本

`md-garden` 側で `data-plugins` を指定します。

```html
<md-garden
  id="main"
  src="index.md"
  data-plugins="toc,highlight,math,graph,chart,author-mode">
</md-garden>
```

- 既定 plugin は `toc` と `author-mode`
- `auto-indexer` は `author-mode` の後方互換 alias
- `data-inline-spa="true"` の場合は、`inline-spa` が自動的に追加されます

## 組み込み plugin の使い方

### `toc`

見出し（`h2`,`h3`）から目次を生成します。表示先は `.toc` 要素です。

```md
nav{.toc}

## Section A
## Section B
### Section B-1
```

### `highlight`

コードブロックをハイライトします。テーマは `data-highlight-style` で指定できます。

```html
<md-garden
  id="main"
  src="index.md"
  data-plugins="highlight"
  data-highlight-style="github">
</md-garden>
```

````md
```js
const hello = "world";
console.log(hello);
```
````

### `math`

数式レンダリング（MathJax）を有効化します。インライン数式と `math` コードブロックを扱えます。

````md
This is inline math: $E = mc^2$

```math
\int_a^b f(x)\,dx
```
````

### `graph`

`graph` コードブロック内の JSON を c3 グラフとして描画します。

````md
```graph
{
  "data": {
    "columns": [
      ["sales", 30, 200, 100, 400]
    ]
  }
}
```
````

### `chart`

`chart` コードブロックを Mermaid として描画します。

````md
```chart
flowchart TD
  A[Start] --> B{Ready?}
  B -->|Yes| C[Run]
  B -->|No| D[Wait]
```
````

### `inline-spa`

inline mode で `?page=` 遷移を扱う plugin です。`data-inline-spa="true"` で自動追加されます。

```html
<md-garden
  id="main"
  data-inline-spa="true"
  data-inline-spa-param="page"
  data-inline-default-page="home.md">
</md-garden>
```

### `author-mode`

Author Mode の UI と機能（sitemap / local editor / Offline Wiki export）を提供します。  
詳細設定は [Author Mode](author_mode.md) と [author_mode_plugin](author_mode_plugin.md) を参照してください。

```html
<mdg-author viewer-id="main"></mdg-author>
<md-garden id="main" src="index.md" data-plugins="toc,author-mode"></md-garden>
```

埋め込み表示の例:

```md
list{.auto-indexer-page-list sort-key="lastModified,path" sort-order="desc"}
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
```

## 開発者向け

plugin のライフサイクル、イベント、最小実装例、デバッグ方針は [Plugin Dev Guide](plugin_dev_guide.md) に分離しています。

## Back links
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
