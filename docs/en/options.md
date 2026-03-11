---
title: "MDGarden - Options Reference"
lastModified: "2026-03-08T12:30:00+09:00"
indexing: true
---

# Options Reference
This page is an implementation-based comprehensive reference for the options that can be specified in `config.json` and `<md-garden>`.

## Application Order (Priority)

If the same key is specified in multiple places, the later one overwrites the previous ones.

1. `DEFAULT_VIEWER_OPTIONS` (Implementation default values)
2. `config.json` (Auto-loaded by default)
3. Additional configuration file specified by `data-config`
4. `data-option` (JSON string)
5. Individual `data-*` attributes

Notes:

- If `link_target` is not specified, the `id` of `<md-garden id="...">` is used.
- `mode` is not a setting value, but is automatically determined by the presence or absence of the `src` attribute (`include` / `inline`).

## `<md-garden>` Attributes

### Basic Attributes

| Attribute | Type | Corresponding Key | Default / Behavior |
|---|---|---|---|
| `id` | `string` | Used as the default for `link_target` | viewer identifier. Illegal configuration if unspecified |
| `src` | `string` | None (Mode determination) | If specified: `include` mode. If unspecified: `inline` mode |
| `data-config` | `string` | None (Additional config URL) | Additionally loads the specified JSON |
| `data-option` | `string(JSON)` | Any | Merged as an options object |
| `data-plugins` | `string(csv)` | None (plugin enablement) | Default is `toc,author-mode`. Admissible names listed below |
| `data-highlight-style` | `string` | None (for highlight plugin) | Default is `github` |

### Viewer Option Attributes (Reflected in `this.option.*`)

| Attribute | Corresponding Key | Type | Default Value |
|---|---|---|---|
| `data-html` | `html` | `boolean` | `false` |
| `data-sanitize` | `sanitize` | `boolean` | `true` |
| `data-format` | `format` | `string` | `"markdown"` |
| `data-spa` | `spa` | `boolean` | `false` |
| `data-inline-spa` | `inline_spa` | `boolean` | `false` |
| `data-inline-spa-param` | `inline_spa_param` | `string` | `"page"` |
| `data-inline-page-attr` | `inline_page_attr` | `string` | `"data-page"` |
| `data-inline-default-page` | `inline_default_page` | `string` | `""` |
| `data-link-target` / `data-link_target` | `link_target` | `string` | `id` |
| `data-frontmatter` | `frontmatter` | `boolean` | `true` |
| `data-allowed-dirs` | `allowed_dirs` | `string(csv)` or `string[]` | `[]` |
| `data-allowed-files` | `allowed_files` | `string(csv)` or `string[]` | Always includes `["index.md","404.md"]` |
| `data-strict-root` | `strict_root` | `boolean` | `false` |
| `data-link-resolution` | `link_resolution` | `"relative"` or `"root"` | `"root"` |
| `data-allow-parent` | `allow_parent` | `boolean` | `false` |
| `data-query-path-mode` | `query_path_mode` | `"full"` or `"split"` | `"full"` |
| `data-execute-script` | `execute_script` | `boolean` | `false` |

Caution:

- `data-status` is used for internal state, not for settings.
- When `inline_spa=true`, the `inline-spa` plugin is automatically added even if not specified in `data-plugins`.

### Built-in Names assignable in `data-plugins`

- `toc`
- `highlight`
- `math`
- `graph`
- `chart`
- `js-run`
- `js-demo`
- `inline-spa`
- `search`
- `author-mode`
- `auto-indexer` (Backward compatible alias for `author-mode`)

## `config.json` Options

`config.json` is merged into `this.option` for each `<md-garden>`.
The following are the main keys referenced by the implementation.

### Common Viewer Keys

| Key | Type | Default Value | Description |
|---|---|---|---|
| `html` | `boolean` | `false` | Permit HTML inside Markdown |
| `sanitize` | `boolean` | `true` | Sanitization via DOMPurify |
| `format` | `string` | `"markdown"` | Practically unused in current normal display flows |
| `spa` | `boolean` | `false` | Enable query transitions in include mode |
| `inline_spa` | `boolean` | `false` | Enable `?page=` transitions in inline mode |
| `inline_spa_param` | `string` | `"page"` | Query key for inline SPA |
| `inline_page_attr` | `string` | `"data-page"` | Page attribute name for inline templates |
| `inline_default_page` | `string` | `""` | Default page during inline page resolution |
| `frontmatter` | `boolean` | `true` | Enable frontmatter parsing |
| `link_target` | `string` | viewer `id` | Target viewer to re-render upon transitions |
| `allowed_dirs` | `string[]` or `string(csv)` | `[]` | Allowed top-level directories in include mode |
| `allowed_files` | `string[]` or `string(csv)` | `["index.md","404.md"]` | Single file allowlist when `strict_root=true` |
| `strict_root` | `boolean` | `false` | Enable restrictions on root directory references |
| `link_resolution` | `"relative"` or `"root"` | `"root"` | Resolution policy for relative/root paths |
| `allow_parent` | `boolean` | `false` | Permit `..` resolution |
| `query_path_mode` | `"full"` or `"split"` | `"full"` | URL query format |
| `execute_script` | `boolean` | `false` | Enable `<script>` execution after rendering |

### `plugins` Key (Individual Plugin Settings)

`plugins` is an object. Currently, the configured keys are interpreted by `js-run` / `js-demo` / `search`.

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

Keys usable under `plugins.<pluginName>`:

| Key | Type | Description |
|---|---|---|
| `allowList` | `string[]` | Allowed library names. If unspecified, all registry libraries are allowed |
| `trustedOrigins` | `string[]` | Additional permitted `https` origins. Added to the default origins |
| `libraries` | `object` | Addition/Override of library definitions |

Format of `libraries.<name>`:

| Key | Type | Required | Description |
|---|---|---|---|
| `global` | `string` | Required | Global name to reference |
| `urls` | `string` or `string[]` | Required | Loading URL (`https` and trusted origin only) |

Keys for `plugins.search`:

| Key | Type | Default Value | Description |
|---|---|---|---|
| `index_path` (`indexPath`) | `string` | `"search-index.json"` | Reference for search index JSON. Prioritized if exists. |
| `sitemap_path` (`sitemapPath`) | `string` | `"sitemap.json"` | Fallback reference if `index_path` does not exist or cannot be read. |

### `author_mode` Key

Author Mode related parameters are designated under `author_mode`. As backward compatibility, some top-level keys are also interpreted.

| Key | Type | Default Value | Description |
|---|---|---|---|
| `author_mode.enabled` | `boolean` | `true` (if `author_mode` not present) / `false` (if `author_mode` exists but `enabled` is omitted) | Overall Author Mode enable/disable |
| `author_mode.deploy` | `string[]` or `string` | `[]` | Deploy targets used for production URL detection |
| `author_mode.auto_indexer.enabled` | `boolean` | `false` | Enable Auto Indexer |
| `author_mode.auto_indexer.strict` | `boolean` | `true` | Strict mode |
| `author_mode.auto_indexer.frontmatter_fallback` | `boolean` | `false` | Fill missing Front Matter using `Last-Modified` / first heading |
| `author_mode.auto_indexer.mode` | `string` | `"include-only"` | Currently only `include-only` is valid |
| `author_mode.auto_indexer.sitemap_path` | `string` | `"sitemap.json"` | sitemap path |
| `author_mode.auto_indexer.db_prefix` | `string` | `"mdgarden_auto_indexer"` | IndexedDB name prefix |
| `author_mode.auto_indexer.pbkdf2_iterations` | `number` | `210000` | iterations for key derivation |
| `author_mode.local_editor.enabled` | `boolean` | `false` | Enable Local Editor |
| `author_mode.local_editor.auto_reload` | `boolean` | `true` | Auto-reload after saving |
| `author_mode.offline_export.enabled` | `boolean` | `true` | Enable Offline Wiki export |
| `author_mode.offline_export.file_name` | `string` | `"bundle.html"` | Output file name |
| `author_mode.offline_export.query_param` | `string` | `"page"` | Query parameter name for exported wiki |
| `author_mode.offline_export.default_page` | `string` | `""` | Default page |
| `author_mode.offline_export.viewer_id` | `string` | `""` | Overwrite output target viewer |

Backward compatibility keys (interpreted at top-level):

- `deploy`
- `auto_indexer`
- `local_editor`
- `offline_export`
- `inline_export` (Compatibility alias for `offline_export`)

## Example

```html
<md-garden
  id="main"
  src="index.md"
  data-config="config.json"
  data-plugins="toc,highlight,math,graph,chart,js-run,js-demo,author-mode"
  data-highlight-style="github"
  data-link-resolution="relative"
  data-query-path-mode="split">
</md-garden>
```

```json
{
  "spa": true,
  "frontmatter": true,
  "link_target": "main",
  "strict_root": false,
  "link_resolution": "relative",
  "allow_parent": true,
  "query_path_mode": "split",
  "plugins": {
    "js-run": {
      "allowList": ["mathjs", "decimal"],
      "trustedOrigins": ["https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"]
    },
    "js-demo": {
      "allowList": ["d3", "three", "p5", "mathjs", "decimal"]
    }
  },
  "author_mode": {
    "enabled": false,
    "deploy": ["https://example.com/"],
    "auto_indexer": {
      "enabled": false,
      "mode": "include-only",
      "strict": true,
      "frontmatter_fallback": false,
      "sitemap_path": "sitemap.json"
    },
    "local_editor": {
      "enabled": false,
      "auto_reload": true
    },
    "offline_export": {
      "enabled": true,
      "file_name": "bundle.html",
      "query_param": "page"
    }
  }
}
```

## Back links
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
