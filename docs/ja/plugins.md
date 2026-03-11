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
  data-plugins="toc,highlight,math,graph,chart,js-run,js-demo,author-mode">
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

### `js-run`　*experimental*

`js-run` コードブロックを sandbox iframe 内で実行します。  
実行はブラウザ内のみで、ネットワーク API は無効化され、タイムアウトと出力上限が適用されます。
`js:run` も互換 alias として利用できます。
初期表示は `Code` タブで、`Run` ボタン押下時に実行され `Result` タブへ切り替わります。
`// libs: mathjs, decimal` の directive で許可ライブラリを指定できます。
`config.json` の `plugins.js-run` で `allowList/trustedOrigins/libraries` を上書き可能です。
利用ライブラリはコード先頭の directive で指定します（allowlist 方式）。
詳細仕様は [js_sandbox_plugins](js_sandbox_plugins.md) を参照してください。

````md
```js-run
// libs: mathjs, decimal
console.log("hello from sandbox");
const sum = api.math.sum([1, 2, 3]);
const precise = new api.Decimal("0.1").plus("0.2").toString();
return { sum, precise };
```
````

### `js-demo` *experimental*

`js-demo` コードブロックを demo 用 sandbox iframe で実行します。  
`Run` 押下時に実行され、`Result` タブで描画結果とログを確認できます。
`js:demo` も互換 alias として利用できます。
`config.json` の `plugins.js-demo` でも `allowList/trustedOrigins/libraries` を上書き可能です。
利用ライブラリはコード先頭の directive で指定します（allowlist 方式）。
詳細仕様は [js_sandbox_plugins](js_sandbox_plugins.md) を参照してください。


````md
```js-demo
// libs: d3, mathjs
const radius = api.math.round(api.math.pi * 15, 0);
const svg = api.d3.select(api.mount).append("svg")
  .attr("width", api.width)
  .attr("height", api.height);
svg.append("circle")
  .attr("cx", 100)
  .attr("cy", 100)
  .attr("r", radius)
  .attr("fill", "#60a5fa");
return { radius };
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
