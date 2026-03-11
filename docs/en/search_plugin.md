---
title: "MDGarden - Search Plugin"
lastModified: "2026-03-09T00:02:00+09:00"
indexing: true
---
# Search Plugin

This document summarizes the specifications and usage of the `search` plugin based on the current implementation (`src/assets/js/plugins/search-plugin.js`).

## Overview

The Search plugin indexes Markdown based on `sitemap.json` and provides full-text search via the `mdg-search` component.

- The search UI is deployed in the `mdg-search` component.
- The search targets support both `include` and `inline(embedded)` modes.
- In `include` mode, `search-index.json` is used preferentially.
- If `search-index.json` is missing, it falls back to building the index by reading each Markdown file from `sitemap.json`.

## Activation

### 1. Enable the plugin

```html
<md-garden
  id="main"
  src="index.md"
  data-plugins="toc,search,author-mode">
</md-garden>
```

### 2. Place the search UI

```html
<mdg-search viewer-id="main"></mdg-search>
```

Supplement:

- Specify the target viewer with the `viewer-id` (or `viewer`) attribute (defaults to `main` if omitted).
- If `mdg-search` exists, it will be automatically registered even if `search` is not specified.
- If `data-inline-spa="true"`, `search` is added automatically.

## `mdg-search` Component

Available attributes:

- `viewer-id` (`viewer`): Target `md-garden` id.
- `placeholder`: Input placeholder (default: `Search pages...`).
- `max-results`: Maximum number of results displayed (default: `24`).

State:

- The number of ready items is reflected in the `data-ready` attribute rather than being displayed as text.
- During index construction: `indexing...`
- When API is disconnected: `unavailable`
- During a search: `Matching items / Total items`

Behavior:

- When the query is an empty string, the results list is hidden.
- When clicking on a result, the input and results are cleared, and transition occurs.
- The viewport is returned to the top during transition.

## Index Construction Method

### inline (embedded) mode

- Scans and indexes embedded Markdown like `<template data-page="...">`.
- The text with Front Matter, code blocks, and formatting removed becomes the search target.

### include mode

1. Retrieves `plugins.search.index_path` (default: `search-index.json`).
2. If loading is successful and `pages` is valid, it is adopted.
3. Upon failure, it falls back to `plugins.search.sitemap_path` (default: `sitemap.json`).
4. Reads each Markdown file based on the `pages` of the sitemap and generates search entries.

Supplement:

- The index is updated during initialization and `content_loaded/content_reloaded`.
- When signatures match, rebuilding is skipped, suppressing unnecessary reloading.

## Search Logic

- Queries are lowercased and spaces are normalized.
- Tokens follow an AND condition (all tokens must match).
- The score adds points for exact prefix/partial matches of `title/page`, and for the first matching position.
- Ties are resolved by the alphabetical order of `page`.

## Configuration (`config.json`)

```json
{
  "plugins": {
    "search": {
      "index_path": "search-index.json",
      "sitemap_path": "sitemap.json"
    }
  }
}
```

- `index_path` (`indexPath`): Path to the pre-generated index JSON.
- `sitemap_path` (`sitemapPath`): Fallback sitemap path.

## Author Mode Integration (Save INDEX)

When `author-mode` and `search` are enabled simultaneously, `Save INDEX` is displayed in `mdg-author`.

- Display condition: search API is enabled.
- Activation condition: `AUTHOR_MODE` is true and `dirty=true`.
- Execution API: `window.MDGarden[viewerId].authorMode.saveSearchIndex(option?)`

Main output:

- Default file name: `search-index.json`
- Format: `version`, `generatedAt`, `source`, `pages`

## `search-index.json` Format

```json
{
  "version": 1,
  "generatedAt": "2026-03-08T00:00:00.000Z",
  "source": {
    "sitemapPath": "sitemap.json",
    "signature": "..."
  },
  "pages": [
    {
      "p": "content/getting_started.md",
      "t": "Getting Started",
      "s": "searchable text..."
    }
  ]
}
```

- `p`: page path
- `t`: title
- `s`: pre-processed search text

The `search` plugin side can read both shortened keys (`p/t/s`) and normal keys (`page/title/text`).

## Performance Guidelines

- Sites with many pages should prioritize generating and using `search-index.json`.
- `s` is lightweight by omitting information unnecessary for searching.
- Integrate `Save INDEX` into the update flow to synchronize the published content with the index.

## Troubleshooting

- Always `unavailable`:
  - `search` plugin is not enabled, or `viewer-id` does not match.
- Initial load is heavy in include mode:
  - `search-index.json` is missing, and the sitemap fallback is reading all Markdown files.
- Few or no results appear:
  - Check the `max-results` setting, whether the page has `indexing: false`, or the generated content of `s`.
