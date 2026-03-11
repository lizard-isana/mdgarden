---
title: "MDGarden - API"
lastModified: "2026-03-06T09:00:00+09:00"
indexing: true
---

# API
This page is an initial reference of the MDGarden JavaScript API organized from an implementation perspective.  
It primarily targets the viewer API under `window.MDGarden` and the Author Mode API.

## API Exposure Level

Each viewer is exposed with its `id` as the key.

```js
const api = window.MDGarden.main; // <md-garden id="main">
```

If Author Mode is enabled, the following is also accessible:

```js
const authorApi = window.MDGarden.main.authorMode;
```

For backward compatibility, `autoIndexer` also references the same API:

```js
const legacy = window.MDGarden.main.autoIndexer; // alias
```

## Basic viewer API

Main methods for `window.MDGarden[viewerId]`:

- `load(target?, option?)`
- `setMarkdown(markdown, option?)`
- `setPage(page, option?)` (inline mode)
- `getCurrentPage()` (inline mode)

Example:

```js
const viewer = window.MDGarden.main;
await viewer.load("getting_started.md");
viewer.setMarkdown("# Temporary page");
```

## Author Mode API

Main methods for `window.MDGarden[viewerId].authorMode`:

- `getStatus()`
- `getRuntimeSettings()`
- `setRuntimeSettings(settings)`
- `resetRuntimeSettings()`
- `getSitemap(option?)`
- `saveSitemap(option?)`
- `saveSearchIndex(option?)`
- `openLocalEditor()`
- `saveLocalEditor(markdown, option?)`
- `exportOfflineWiki(option?)`
- `exportInlineWiki(option?)` (backward compatible alias)

Representative examples:

```js
const author = window.MDGarden.main.authorMode;
const status = await author.getStatus();
const opened = await author.openLocalEditor();
await author.saveLocalEditor(opened.content, { autoReload: true });
await author.saveSearchIndex({ fileName: "search-index.json" });
await author.exportOfflineWiki({ fileName: "bundle.html" });
```

## Events

Event constants for plugins:

- `markdown_loaded`
- `content_loaded`
- `content_reloaded`
- `content_rendered`

Reference:

```js
window.MDGarden.PLUGIN_EVENTS;
```

Use `onEvent` to monitor events in custom plugins.  
Additionally, hooks can be registered using `window.MDGarden.registerHook(viewId, eventName, handler)`.

## Plugin Related API

Main globally exposed functions:

- `window.MDGarden.registerPlugin(viewId, plugin)`
- `window.MDGarden.emitPluginEvent(viewId, eventName, payload)`
- `window.MDGarden.loadScripts(urls)`
- `window.MDGarden.loadStyles(urls)`

Minimal example:

```js
window.MDGarden.registerPlugin("main", {
  name: "sample",
  onEvent: ({ event }) => console.log(event)
});
```

## Return Values and Error Handling

- Read operations are often designed to return `ok` / `state` / `errors`.
- Write operations `throw` on failure.
- Save operations in Author Mode require a user interaction trigger (browser constraint).

In implementation, assume the code should be wrapped in `try/catch`.

```js
try {
  const result = await window.MDGarden.main.authorMode.saveSitemap();
  console.log(result.ok);
} catch (error) {
  console.error(error.message);
}
```

## dataset and State Checking

In Author Mode, execution states are reflected in the `dataset` of `<html>`.

- `data-auto-indexer-mode`
- `data-auto-indexer-state`
- `data-auto-indexer-dirty`
- `data-local-editor-enabled`
- `data-local-editor-ready`
- `data-export-enabled`
- `data-export-ready`
- `data-current-path`

For UI integration, using `dataset` alongside `getStatus()` yields stable results.

## Compatibility Note

- `authorMode` and `autoIndexer` refer to the same API (for maintaining compatibility).
- `exportInlineWiki()` is a compatible alias for `exportOfflineWiki()`.
- The current setting key is `offline_export` (`inline_export` is interpreted for compatibility).

## Back links
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
