---
title: "MDGarden - Author Mode"
lastModified: "2026-03-09T20:15:00+09:00"
indexing: true
---

# Author Mode
Author Mode is an operational mode that assists with local editing, index updating, and exporting for distribution altogether.  
It is not a mechanism for directly rewriting the public site, but rather designed as an auxiliary feature to improve local workflow efficiency.

## Activation Conditions

Author Mode is enabled under the following conditions:

- Opened from `localhost` or `127.0.0.1`.
- The current URL is not under the public URL specified in `author_mode.deploy`.

This determination reduces the risk of accidentally exposing the editing UI in a public environment.

## Overall Features

- `auto_indexer`: Accumulates page information in IndexedDB and generates `sitemap.json`.
- `local_editor`: Directly edits the Markdown of the currently displayed page and saves it locally.
- `offline_export`: Exports the include configuration as an Offline Wiki (single HTML).

## Search Plugin Integration

Author Mode does not have a search feature by itself, but it integrates with the `search` plugin to support search index operations.

- When the `search` plugin is enabled, a `Save INDEX` button is displayed in `mdg-author`.
- You can only execute `Save INDEX` when in `AUTHOR_MODE` and when `dirty=true`.
- `Save INDEX` generates `search-index.json` and reduces the initialization cost of search upon publication.

For detailed search specifications, please refer to the [Search Plugin](search_plugin.md).

## Preliminary Settings (Recommended)

Set up `author_mode` in `config.json`.

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

## Expected Workflow

1. Open a page in include mode.
2. Edit required Markdown (local editor is also an option).
3. Review sitemap diffs and save.
4. For setups that use search, update `search-index.json` via `Save INDEX`.
5. Export the Offline Wiki as needed.
6. After final confirmation, reflect the changes in Git and publish.

The advantage of Author Mode is the ability to handle editing, indexing, and distribution in a single workflow.

## Auto Indexer

The Auto Indexer structures a sitemap from targeted and rendered page information.

- It determines updates based on `lastModified` in Front Matter.
- If `frontmatter_fallback=true`, it supplements missing `lastModified` data with HTTP `Last-Modified`.
- Pages with `indexing: false` are excluded from the sitemap.
- When `strict=true`, updates where `lastModified` shifts backward in time are rejected.
- By comparing body hashes (notify-only), it detects missed updates by warning about body changes when `lastModified` remains the same.

During operation, standardizing the team rule for entering `lastModified` reduces inconsistencies.

### Front Matter Requirements (auto_indexer)

Please include `lastModified` in target pages.

```yaml
---
title: "Page Title"
lastModified: "2026-03-01T12:00:00Z"
indexing: true
---
```

- `lastModified` must follow RFC3339 (timezone is required).
  - e.g., 2026-01-01T12:00:00Z (UTC), 2026-01-01T12:00:00+09:00 (JST)
- If `title` is not specified, it defaults to `"Untitled"` (if `frontmatter_fallback=true`, it falls back to the top heading of the rendered root).
- If invalid or not set, updating pauses and the dirty status is maintained.
- It performs a SHA-256 hash comparison of the body (notify-only), and if the body changes while `lastModified` remains identical, it prompts for an update by warning as `dirty=true`.
- If `indexing: false`, the existing entry is deleted.

### Embedding in Pages (List / Backlinks)

Auto Indexer information can be displayed within Markdown using embedded notation.

```md
list{.auto-indexer-page-list sort-key="lastModified,path" sort-order="desc" limit="10"}
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
```

- `list`: Displays a list of pages from the sitemap.
- `backlinks`: Displays a list of backlinks pointing to the current page.
- Display styling can be adjusted via `sort-key` / `sort-order` / `limit` / `empty-label`, etc.

This can be used in normal display for include mode, and it will be expanded as a static link list when exported as an Offline Wiki.

## Local Editor

With the Local Editor, you can edit the currently displayed Markdown via a textarea and save it.

- The save destination is chosen through a dialog every time.
- `auto_reload` controls the reload behavior after saving.
- Assumes a browser supporting the File System Access API.

Note that this performs purely "local file operations" rather than a "direct server write."

## Offline Export

Offline Export collects pages according to the sitemap and generates an HTML file for distribution.

- Internal links are converted to the `?page=` format.
- Additional viewers (such as header/footer) can also be bundled into the same HTML.
- Viewers matching `src=*.md` are expanded into templates upon export, allowing `file://` display.

## Configuration Hierarchy

Configurations unfold across three layers (latter takes precedence).

1. `config.json` / Tag Attributes.
2. Author Mode runtime conditions (local/deploy conditions).
3. Runtime overrides (`runtimeOverride` in IndexedDB).

Runtime settings are volatile configurations that are expected to disappear when browser storage is cleared.

## Security Boundary

- Author Mode is not an authentication system.
- UI states (like `data-author`) are not permission controls.
- The Local Editor relies entirely on browser permissions.

To reduce risks when coexisting with other scripts, manage the use of `execute_script` carefully.

## Common Troubleshooting

- `lastModified moved backwards` appears  
  Update to a time newer than the existing value, or review the `strict` setting.
- The save dialog does not appear as expected  
  Verify browser permissions and ensure it stems from user interaction (like a click).
- Cannot enter Author Mode  
  Verify if the URL is localhost or if it falls outside the specified deploy paths.
- Some display breaks after export  
  Review reference assets and configuration differences specific to each viewer.

## Best Practices

- Ensure the Git state is clean before working.
- Decide on a rule for updating `lastModified`.
- Review diffs before saving the sitemap.
- Record the generating commit in Offline outputs.
- Perform a display check equivalent to the `reader` mode before final publication.

## Back links
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
