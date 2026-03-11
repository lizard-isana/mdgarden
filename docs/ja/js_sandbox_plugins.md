---
title: "MDGarden - JS Sandbox Plugins"
lastModified: "2026-03-07T23:10:00+09:00"
indexing: true
---

# JS Sandbox Plugins

このページは `js-run` と `js-demo` の仕様をまとめたドキュメントです。  
対象実装:

- `src/assets/js/plugins/js-run-plugin.js`
- `src/assets/js/plugins/js-demo-plugin.js`

## 使い分け

- `js-run`: 計算・ログ出力向け。Worker 実行で強制停止しやすい
- `js-demo`: d3/three/p5 など描画デモ向け。DOM/Canvas を使える

## 有効化

```html
<md-garden
  id="main"
  src="index.md"
  data-plugins="toc,highlight,js-run,js-demo">
</md-garden>
```

## `config.json` での拡張

`plugins.js-run` / `plugins.js-demo` でライブラリ設定を上書きできます。

```json
{
  "plugins": {
    "js-run": {
      "allowList": ["mathjs", "decimal", "astronomy"],
      "trustedOrigins": ["https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      "libraries": {
        "astronomy": {
          "global": "Astronomy",
          "urls": [
            "https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js"
          ]
        }
      }
    }
  }
}
```

仕様:

- `allowList`: `// libs:` で利用可能な名前の許可リスト
- `trustedOrigins`: `libraries.urls` で許可する origin
- `libraries`: カスタムライブラリ定義（`global` + `urls`）
- URL は `https` かつ `trustedOrigins` に含まれる origin のみ有効
- sandbox 実行では browser 向け build を使ってください（例: `astronomy.browser.min.js`）
- Node 向け build（例: `astronomy.min.js`）はロード失敗することがあるため非推奨です

## `js-run`

### 記法

````md
```js-run
// libs: mathjs, decimal
console.log("hello from sandbox");
const sum = api.math.sum([1, 2, 3]);
const precise = new api.Decimal("0.1").plus("0.2").toString();
return { sum, precise };
```
````

`js:run` も互換 alias として利用できます。

### UI

- 初期表示: `Code` タブ
- `Run` 押下で実行開始し `Result` タブへ切り替え
- `status`: `idle` / `running` / `done` / `error` / `timeout`

### libs directive

`js-run` でも `// libs: ...` を指定できます。  
現在の allowlist:

- `mathjs`
- `decimal`

設定例の `astronomy` を追加した場合:

```js
// libs: astronomy
const Astronomy = api.libs.astronomy;
```

### 制限値

- timeout: `1500ms`
- 出力上限: `64KiB`
- 行数上限: `200`
- iframe 高さ: `300px`

### セキュリティ要点

- 外側 iframe: `sandbox="allow-scripts"`（`allow-same-origin` なし）
- 内部実行: Worker + `terminate()` で停止
- `fetch` / `XMLHttpRequest` / `WebSocket` / `EventSource` / `importScripts` を無効化

## `js-demo`

### 記法

````md
```js-demo
// libs: d3, mathjs
const radius = api.math.round(api.math.pi * 15, 0);
const svg = api.d3.select(api.mount).append("svg")
  .attr("width", api.width)
  .attr("height", api.height);
svg.append("circle").attr("cx", 80).attr("cy", 80).attr("r", radius).attr("fill", "#60a5fa");
return { radius };
```
````

`js:demo` も互換 alias として利用できます。

### libs directive

コード内で `// libs: ...` を指定します。  
指定された名前だけを allowlist から読み込みます。

対応ライブラリ:

- `d3`
- `three`
- `p5`
- `mathjs`
- `decimal`

例:

```js
// libs: d3, three
```

不明な名前は無視され、allowlist にない URL は読み込みません。

### 実行時 API

`js-demo` のコードには `api` が渡されます。

- `api.mount`: 描画先要素
- `api.width` / `api.height`: 描画領域サイズ
- `api.libs`: 読み込み済みライブラリ辞書
- `api.d3` / `api.THREE` / `api.p5`: 各ライブラリへのショートカット
- `api.math` / `api.Decimal`: mathjs / decimal のショートカット
- `api.log(...)`: ログ出力
- `api.clear()`: `mount` の初期化

### UI

- 初期表示: `Code` タブ
- `Run` 押下で `Result` タブへ切り替え
- `Result` には preview iframe とログ出力を表示
- `status`: `idle` / `loading` / `running` / `done` / `error` / `timeout`

### 制限値

- timeout: `10000ms`
- 出力上限: `64KiB`
- 行数上限: `200`
- iframe 高さ: `380px`

### セキュリティ要点

- 外側 iframe: `sandbox="allow-scripts"`
- preview iframe: `sandbox="allow-scripts"`
- runtime CSP で `script-src` を CDN allowlist（jsdelivr/cdnjs）のみに固定
- `connect-src 'none'`
- ユーザーコード実行前に `fetch` / `XMLHttpRequest` / `WebSocket` / `EventSource` / `window.open` を無効化

## 注意点

- `js-demo` は DOM/Canvas 実行のため、`js-run` ほど停止制御は強くありません
- heavy 描画や無限ループはブラウザ負荷につながります
- 外部アセット取得（テクスチャや追加データ）は既定で禁止です

## トラブルシューティング

- `Result` が `undefined`
  - `return` を書いて戻り値を返してください
- `timeout`
  - 処理を短くするか、描画サイズ・反復回数を下げてください
- ライブラリが使えない
  - 先頭の `// libs:` 指定を確認してください
  - allowlist 外のライブラリは読み込まれません

## Back links
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
