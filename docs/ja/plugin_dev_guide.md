---
title: "MDGarden - Plugin Dev Guide"
lastModified: "2026-03-06T16:35:00+09:00"
indexing: true
---

# Plugin Dev Guide
このページは、MDGarden の plugin を実装する開発者向けガイドです。  
組み込み plugin の利用方法は [Plug-ins](plugins.md) を参照してください。

## Purpose / Scope

- 対象読者: MDGarden の挙動を拡張したい開発者
- 対象範囲: plugin runtime、イベント連携、実装パターン、運用上の注意
- 非対象: 組み込み plugin の使い方（`plugins.md` 側で説明）

## Plugin Architecture

- plugin は viewer（`<md-garden id="...">`）単位で登録されます
- 実行基盤は `window.MDGarden.pluginRuntime` です
- 登録 API:
  - `window.MDGarden.registerPlugin(viewId, plugin)`
- plugin runtime が提供する `ctx`:
  - `ctx.viewId`
  - `ctx.getViewer()`
  - `ctx.loadScripts(urls)`
  - `ctx.loadStyles(urls)`

## Plugin Contract (API)

plugin は次の形のオブジェクトです。

```js
{
  name: "plugin-name",
  onInit: ({ ctx }) => {},
  onEvent: ({ event, payload, ctx }) => {},
  onDispose: ({ ctx }) => {},
  transformCode: ({ code, lang, ctx }) => {}
}
```

- `name`: 省略時は `"anonymous_plugin"` として扱われます
- `onInit`: viewer 初期化時に1回実行されます
- `onEvent`: plugin event ごとに呼ばれます
- `onDispose`: viewer 破棄時に呼ばれます
- `transformCode`: コードブロック変換フックです
  - `undefined` を返すと「未変換」
  - 文字列を返すとその値で置換

## Lifecycle

1. `registerPlugin(viewId, plugin)` で plugin を登録
2. viewer 初期化時に `onInit`
3. Markdown 読み込み/描画の各フェーズで `onEvent`
4. viewer 破棄時に `onDispose`

補足:

- viewer 初期化後に `registerPlugin` した場合も `onInit` は即時実行されます
- plugin 例外は runtime 側で捕捉され、`console.error` に出力されます

## Event Reference

`window.MDGarden.PLUGIN_EVENTS` で参照できる標準イベント:

- `markdown_loaded`
  - Markdown 読み込み完了直後、HTML変換前
- `content_rendered`
  - HTML が section に反映された後
- `content_loaded`
  - 初回描画時に発火
- `content_reloaded`
  - SPA遷移など再描画時に発火
- `code_highlight`
  - `onEvent` ではなく hook/`transformCode` 系で使うイベント名

実務では `content_loaded` / `content_reloaded` を同じ処理で扱う構成が安定します。

## Payload / Context Spec

`onEvent` の引数は `{ event, payload, ctx }` です。

`payload` の代表的な形:

```js
// markdown_loaded / content_rendered
{
  viewer: /* MarkdownViewer */,
  target: /* md-garden element */,
  status: "content_loaded" | "content_reloaded", // content_rendered のとき
  context: {
    viewerId: "main",
    currentDocPath: "index.md",
    normalizedPath: "index.md",
    frontmatter: { title: "...", lastModified: "..." },
    mode: "include" | "inline",
    status: "..."
  }
}
```

```js
// content_loaded / content_reloaded
{
  target: /* md-garden element */,
  status: "content_loaded" | "content_reloaded",
  context: {
    viewerId: "main",
    currentDocPath: "index.md",
    normalizedPath: "index.md",
    frontmatter: { ... },
    mode: "include" | "inline",
    status: "..."
  }
}
```

`ctx` の実用ポイント:

- `ctx.getViewer()` で対象 viewer を取得
- `ctx.loadScripts` / `ctx.loadStyles` は URL 配列も受け取れる

## Minimal Plugin Example

```js
const createHelloPlugin = () => {
  return {
    name: "hello",
    onInit: ({ ctx }) => {
      const viewer = ctx.getViewer();
      console.log("init:", viewer && viewer.id);
    },
    onEvent: ({ event, payload }) => {
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

## Advanced Patterns

- 遅延ロード:
  - `onEvent` で必要時に `ctx.loadScripts` / `ctx.loadStyles` を呼ぶ
  - ロード済みフラグを保持して多重読み込みを防ぐ
- 再入安全:
  - `dataset` フラグ（例: `data-mdgarden-*-rendered`）で二重処理を防止
- スコープ限定:
  - `payload.target` 以下だけをクエリし、`document` 全体走査を避ける
- SPA対応:
  - `content_loaded` と `content_reloaded` の両方を処理対象にする

## Performance Guidelines

- 重い処理を `content_rendered` ごとに全件実行しない
- DOM クエリは `payload.target` を起点に最小化する
- レイアウトスラッシングを避ける
- `onDispose` でイベントリスナやタイマーを解放する

## Security Guidelines

- plugin はブラウザ内で任意コードを実行できるため、配布元の信頼性を確認する
- 外部 CDN 読み込みは固定バージョンを使う
- `data-execute-script="true"` と併用する場合は特にレビューを厳格化する
- ユーザー入力や外部データを DOM に入れるときはサニタイズ方針を明確化する

## Debugging / Troubleshooting

- イベントが来ない:
  - `viewId` と `registerPlugin` 対象 viewer id を確認
  - `data-plugins` の指定名と registry 名の一致を確認
- 処理対象が取れない:
  - `payload.target` が存在するイベントか確認
  - 必要なら `ctx.getViewer()` へフォールバック
- 二重描画される:
  - `dataset` フラグで idempotent にする
- SPA遷移時だけ崩れる:
  - `content_reloaded` を処理対象に含める

## Compatibility / Versioning

- plugin API は `window.MDGarden` 経由で提供されます
- 実装依存の挙動は `src/assets/js/plugins/plugin-runtime.js` と `src/assets/js/mdgarden.js` を基準に確認してください
- 組み込み名の後方互換:
  - `auto-indexer` は `author-mode` の alias

## Checklist for New Plugin

- `name` を設定した
- `content_loaded` と `content_reloaded` を考慮した
- `payload.target` 不在時の分岐を書いた
- 二重実行防止（idempotent）を入れた
- 外部アセットの多重ロードを防いだ
- `onDispose` で後始末を実装した
- docs に利用例を追加した

## Back links
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
