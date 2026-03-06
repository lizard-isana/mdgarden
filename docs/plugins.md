---
title: "MDGarden - Plug-ins"
lastModified: "2026-03-06T09:00:00+09:00"
indexing: true
---

# Plug-ins
MDGarden は plugin で機能を拡張できます。  
標準の表示機能に加えて、目次・数式・グラフ・編集支援などを必要に応じて追加する設計です。

## 組み込み plugin 一覧

- `toc`: 見出しベースの目次生成
- `highlight`: コードハイライト
- `math`: 数式レンダリング
- `graph`: Mermaid グラフ描画
- `chart`: Chart.js チャート描画
- `inline-spa`: inline mode の `?page=` 遷移補助
- `author-mode`: sitemap / local editor / offline export（詳細は [Author Mode](author_mode.md)）

補足:

- 既定 plugin は `toc` と `author-mode`
- `auto-indexer` は `author-mode` の後方互換 alias

## 読み込み方法

`md-garden` 側で `data-plugins` を指定します。

```html
<md-garden
  id="main"
  src="index.md"
  data-plugins="toc,highlight,math,graph,chart,author-mode">
</md-garden>
```

`data-inline-spa="true"` の場合は、`inline-spa` が自動的に追加されます。

## ライフサイクル

plugin は次のフックを持てます。

- `onInit({ ctx })`: viewer 初期化時に1回実行
- `onEvent({ event, payload, ctx })`: 各イベントで実行
- `onDispose({ ctx })`: viewer 廃棄時に実行
- `transformCode({ code, lang, ctx })`: コードブロック変換

## 主なイベント

標準で利用しやすいイベント:

- `markdown_loaded`
- `content_loaded`
- `content_reloaded`
- `content_rendered`

イベント定数は `window.MDGarden.PLUGIN_EVENTS` から参照できます。

## 依存・順序・競合の注意点

- plugin は指定順で登録されるため、順序依存がある場合は明示的に並べる
- 同じ DOM を操作する plugin は責務を分ける
- `author-mode` と独自編集系 plugin の併用時は UI 競合を確認する
- 重い処理は `content_rendered` の都度フル実行しない

## カスタム plugin の最小例

```js
const createHelloPlugin = () => {
  return {
    name: "hello",
    onInit: ({ ctx }) => {
      const viewer = ctx.getViewer();
      console.log("init:", viewer.id);
    },
    onEvent: ({ event, payload, ctx }) => {
      if (event !== window.MDGarden.PLUGIN_EVENTS.CONTENT_RENDERED) {
        return;
      }
      const root = payload && payload.target ? payload.target : null;
      if (!root) {
        return;
      }
      root.querySelectorAll("h1").forEach((h1) => {
        h1.dataset.hello = "true";
      });
    }
  };
};

window.MDGarden.registerPlugin("main", createHelloPlugin());
```

## デバッグの進め方

- plugin 名と対象 viewer id をログに出す
- `onEvent` で受けた `event` 名をまず確認する
- `payload.target` が null のケースを考慮する
- 問題切り分け時は `data-plugins` を最小構成に絞る

## セキュリティ上の注意

plugin はブラウザ内で任意コードを実行できるため、導入元の信頼性が重要です。

- 不明な plugin を本番へ直接入れない
- 依存ライブラリのバージョンを固定する
- `execute_script` と併用する場合は特にレビューを厳格化する

## Back links
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
