---
title: "MDGarden - API"
lastModified: "2026-03-06T09:00:00+09:00"
indexing: true
---

# API
このページは、MDGarden の JavaScript API を実装観点で整理したリファレンス初稿です。  
主に `window.MDGarden` 配下の viewer API と Author Mode API を対象にします。

## API の公開先

各 viewer は `id` をキーに公開されます。

```js
const api = window.MDGarden.main; // <md-garden id="main">
```

Author Mode を有効化している場合は、次も参照できます。

```js
const authorApi = window.MDGarden.main.authorMode;
```

後方互換として `autoIndexer` も同一APIを参照します。

```js
const legacy = window.MDGarden.main.autoIndexer; // alias
```

## 基本 viewer API

`window.MDGarden[viewerId]` の主なメソッド:

- `load(target?, option?)`
- `setMarkdown(markdown, option?)`
- `setPage(page, option?)`（inline mode）
- `getCurrentPage()`（inline mode）

例:

```js
const viewer = window.MDGarden.main;
await viewer.load("getting_started.md");
viewer.setMarkdown("# Temporary page");
```

## Author Mode API

`window.MDGarden[viewerId].authorMode` の主なメソッド:

- `getStatus()`
- `getRuntimeSettings()`
- `setRuntimeSettings(settings)`
- `resetRuntimeSettings()`
- `getSitemap(option?)`
- `saveSitemap(option?)`
- `openLocalEditor()`
- `saveLocalEditor(markdown, option?)`
- `exportOfflineWiki(option?)`
- `exportInlineWiki(option?)`（後方互換 alias）

代表例:

```js
const author = window.MDGarden.main.authorMode;
const status = await author.getStatus();
const opened = await author.openLocalEditor();
await author.saveLocalEditor(opened.content, { autoReload: true });
await author.exportOfflineWiki({ fileName: "offline-wiki.html" });
```

## イベント

plugin 向けイベント定数:

- `markdown_loaded`
- `content_loaded`
- `content_reloaded`
- `content_rendered`

参照:

```js
window.MDGarden.PLUGIN_EVENTS;
```

自作 plugin でイベント監視する場合は `onEvent` を使います。  
また、`window.MDGarden.registerHook(viewId, eventName, handler)` による hook 登録も可能です。

## plugin 関連 API

グローバルに公開される主な関数:

- `window.MDGarden.registerPlugin(viewId, plugin)`
- `window.MDGarden.emitPluginEvent(viewId, eventName, payload)`
- `window.MDGarden.loadScripts(urls)`
- `window.MDGarden.loadStyles(urls)`

最小例:

```js
window.MDGarden.registerPlugin("main", {
  name: "sample",
  onEvent: ({ event }) => console.log(event)
});
```

## 戻り値とエラーハンドリング

- 読み取り系は `ok` / `state` / `errors` を返す設計が多い
- 書き込み系は失敗時に `throw` される
- Author Mode の保存系はユーザー操作起点が必須（ブラウザ制約）

実装では `try/catch` 前提で扱ってください。

```js
try {
  const result = await window.MDGarden.main.authorMode.saveSitemap();
  console.log(result.ok);
} catch (error) {
  console.error(error.message);
}
```

## dataset と状態確認

Author Mode では `<html>` の dataset に実行状態が反映されます。

- `data-auto-indexer-mode`
- `data-auto-indexer-state`
- `data-auto-indexer-dirty`
- `data-local-editor-enabled`
- `data-local-editor-ready`
- `data-export-enabled`
- `data-export-ready`
- `data-current-path`

UI 連携では dataset と `getStatus()` を併用すると安定します。

## 互換性メモ

- `authorMode` と `autoIndexer` は同一APIを参照（互換維持）
- `exportInlineWiki()` は `exportOfflineWiki()` の互換 alias
- 設定キーは `offline_export` が現行（`inline_export` は互換解釈）

## Back links
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
