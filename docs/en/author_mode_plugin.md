---
title: "author mode"
lastModified: "2026-03-06T00:40:00+09:00"
indexing: true
---

# author_mode / auto-indexer / local-editor / offline-export Guide

This document functions as a usage guide oriented toward the current implementation (`src/assets/js/plugins/author-mode-plugin.js`).

## Overview

The `author-mode-plugin` operates seamlessly as part of `author_mode`.

Main features:

- `auto_indexer`: Incrementally saves page information to `IndexedDB` and outputs `sitemap.json` when necessary.
- `local_editor`: Edits the currently displayed Markdown via a textarea and saves it locally using the File System Access API.
- `offline_export`: Exports the include mode site set as a single-file Offline Wiki HTML.
- All are effective under `AUTHOR_MODE`.

## Preliminary Settings (Recommended)

Establish `author_mode` directly in `config.json`.

```json
{
  "author_mode": {
    "enabled": true,
    "deploy": ["https://example.com/"],
    "auto_indexer": {
      "enabled": true,
      "mode": "include-only",
      "strict": true,
      "frontmatter_fallback": false,
      "sitemap_path": "sitemap.json",
      "db_prefix": "mdgarden_auto_indexer_docs"
    },
    "local_editor": {
      "enabled": true,
      "auto_reload": true
    },
    "offline_export": {
      "enabled": true,
      "file_name": "bundle.html",
      "query_param": "page",
      "default_page": "index.md"
    }
  }
}
```

Supplement:

- If `author_mode` is not set, previous `deploy` / `auto_indexer` settings are interpreted for backwards compatibility.
- `AUTHOR_MODE` determination hinges on just these two conditions:
- Opened at `localhost` or `127.0.0.1`.
- The current URL is not under a public URL specified in `deploy`.

## Front Matter Requirements (auto_indexer)

Enforce declarations encompassing `lastModified` consistently tracking within targeted pages.

```yaml
---
title: "Page Title"
lastModified: "2026-03-01T12:00:00Z"
indexing: true
---
```

- `lastModified` must be in RFC3339 format (timezone is required).
- If `frontmatter_fallback=true`, it supplements missing `lastModified` data with HTTP `Last-Modified`.
- If `title` is not specified, it defaults to `"Untitled"` (if `frontmatter_fallback=true`, it falls back to the top heading of the rendered root).
- If invalid or unset, updating pauses and the dirty status is maintained.
- Performs a SHA-256 hash comparison of the body (notify-only), prompting an update by warning `dirty=true` if the body changes while `lastModified` stays the same.
- Deletes the existing entry if `indexing: false`.

## Author Panel UI

`<mdg-author ...>` provides the Author panel with the following:

- `Save`: Save sitemap
- `Save INDEX`: Save the search index (`search-index.json`) (displayed only when the search plugin is active)
- `Export`: Export the include mode site to a single-file HTML
- `Status`: Displays the status
- `Edit`: Local editor (when `author_mode.local_editor.enabled=true`)

Even with `auto-hide="true"`, the panel remains displayed to preserve the edit flow in `AUTHOR_MODE` where the local editor is active.
The automatic save functionality of `<mdg-author auto-save="...">` has been abolished, making saves purely manual.

Within "Runtime Configurations (IndexedDB Overwrite)" in the settings panel, only attributes that can be safely reflected post-initialization can be modified.

- `auto_indexer.strict`
- `local_editor.enabled`
- `local_editor.auto_reload`
- `offline_export.enabled`
- `offline_export.file_name`
- `offline_export.query_param`
- `offline_export.default_page`
- `offline_export.viewer_id`

These overwritten values are saved in `IndexedDB` (`config.runtimeOverride`) and prioritize over `config.json` / tag attributes.
Deleting the browser's IndexedDB erases these overwritten settings.

## Local Editor Workflow

1. Press the `Edit` button.
2. The currently viewed Markdown unfolds into the textarea.
3. Edit.
4. Press `Save Edits`.
5. Save locally using the File System Access API.
6. (If `auto_reload: true`) The page reloads.

Constraints:

- Exclusively available during `AUTHOR_MODE`.
- Premised on `include` mode.
- Cannot be utilized on browsers unequipped with the File System Access API.

Main configuration options for `local_editor`:

- `enabled`: Activates the local editor.
- `auto_reload`: Enforces automatic reloads after `Save Edits` (default: `true`).
  - Specifying `false` will deactivate automatic reloads post-save.
  - The older `reload_after_save` remains supported for backward compatibility.
- The save dialog always displays, utilizing `showSaveFilePicker` each time to select the destination (auto-save is obsolete).

## Offline Wiki Export Workflow

1. Press the `Export` button.
2. Retrieves the sitemap (live DB) and loads each Markdown from `pages`.
3. Collects pages following sitemap guidelines, converting internal links into the `?page=` format.
   - Embeds like `list{.auto-indexer-page-list ...}` / `backlinks{.auto-indexer-backlinks ...}` expand into static link lists during export.
4. Generates a 1-file Offline Wiki HTML.
5. Saves via `showSaveFilePicker` (or Blob download if unsupported).

Constraints:

- Exclusively available during `AUTHOR_MODE` and include mode.
- Export targets align to the sitemap (excludes `indexing: false`).
- Assets (images/CSS/JS) maintain external references (they don't bundle within the HTML).
- When multiple `md-garden` elements exist on a page, the primary viewer (the `viewer-id` of `mdg-author`) is prepared offline while other viewers are also bundled into the identical HTML.
- Secondary viewer mappings defining `src=*.md` undergo template expansions during export, so they can readily display on `file://` (links convert to `?page=` formatting).

Main configuration options for `offline_export`:

- `enabled`: Activates the export functionality (default: `true`).
- `file_name`: Default filename utilized during export (default: `bundle.html`).
- `query_param`: The page transition query parameter within Offline Wiki configurations (default: `page`).
- `default_page`: Initial display page (if unspecified, relies on a fallback order mapping: current page → `index.md` → topmost document).

## Runtime datasets

States reflect natively unto the `dataset` of `<html>`.

- `data-auto-indexer-mode`: `reader` / `author`
- `data-auto-indexer-state`: `normal` / `init-required` / `recovery-required` / `error`
- `data-auto-indexer-dirty`: `true` / `false`
- `data-local-editor-enabled`: `true` / `false`
- `data-local-editor-ready`: `true` / `false`
- `data-export-enabled`: `true` / `false`
- `data-export-ready`: `true` / `false`
- `data-current-path`: Normalized path referencing the currently navigated page.
- `data-author`: Outputs `"true"` exclusively within `author` operation.

## JavaScript API

`MDGarden[viewerId].authorMode`:

(And as a fallback mechanism for backward compatibility, `MDGarden[viewerId].autoIndexer` references identically toward the identical API architecture)

- `getStatus()`
- `getRuntimeSettings()`
- `setRuntimeSettings(settings)`
- `resetRuntimeSettings()`
- `getSitemap(option)`
- `saveSitemap(option)`
- `saveSearchIndex(option)` (`option.fileName` / `option.file_name`)
- `openLocalEditor()`
- `saveLocalEditor(markdown, option)` (overwritable during calls via `option.autoReload` / `option.reload`)
- `exportOfflineWiki(option)` (`option.fileName` / `option.queryParam` / `option.defaultPage` / `option.viewerId`)
  - The older API `exportInlineWiki(option)` persists identically utilizing backward compatibility frameworks natively.

Example:

```js
const api = MDGarden.main.authorMode;
const opened = await api.openLocalEditor();
await api.saveLocalEditor(opened.content);
await api.saveSearchIndex({ fileName: "search-index.json" });
await api.exportOfflineWiki({ fileName: "bundle.html" });
```

## Precautions

- Does not provide authentication/authorization.
- `data-author` is simply for UI switching; it does not serve as a security trust boundary.
- `auto_indexer.mode` presumes `include-only` as the base parameter.

## UI/UX Revision Points

- The Author panel consolidates "Edit," "Save (sitemap)," and "Settings" into a unified flow.
- Added "Offline Wiki Export" for distribution of Include sites.
- In `AUTHOR_MODE`, the edit flow is maintained even when `auto-hide` is active.
- The status line utilizes a minimal display (focused on `current-path`), optionally appending statuses like `sitemap changed` / `error` / `editor:unavailable` / `export:unavailable` only when necessary.
- Author authentication is simplified strictly to "localhost/127.0.0.1 and completely outside deploy domains."
