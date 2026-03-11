---
title: "MDGarden - Options Reference"
lastModified: "2026-03-08T12:30:00+09:00"
indexing: true
---

# Options Reference
このページは、`config.json` と `<md-garden>` で指定できるオプションを実装ベースで網羅したリファレンスです。

## 適用順序（優先順位）

同じキーを複数箇所で指定した場合は、後勝ちで上書きされます。

1. `DEFAULT_VIEWER_OPTIONS`（実装の既定値）
2. `config.json`（既定で自動読み込み）
3. `data-config` で指定した追加設定ファイル
4. `data-option`（JSON文字列）
5. 個別の `data-*` 属性

補足:

- `link_target` 未指定時は `<md-garden id="...">` の `id` が使われます。
- `mode` は設定値ではなく、`src` 属性の有無で自動決定されます（`include` / `inline`）。

## `<md-garden>` 属性

### 基本属性

| 属性 | 型 | 対応キー | 既定/挙動 |
|---|---|---|---|
| `id` | `string` | `link_target` の既定に使用 | viewer識別子。未指定時は不正構成 |
| `src` | `string` | なし（モード判定） | 指定時 `include` mode、未指定時 `inline` mode |
| `data-config` | `string` | なし（追加設定URL） | 指定したJSONを追加読み込み |
| `data-option` | `string(JSON)` | 任意 | オプションオブジェクトとしてマージ |
| `data-plugins` | `string(csv)` | なし（plugin有効化） | 未指定時は `toc,author-mode`。指定可能名は下記参照 |
| `data-highlight-style` | `string` | なし（highlight plugin用） | 未指定時 `github` |

### viewerオプション属性（`this.option.*` へ反映）

| 属性 | 対応キー | 型 | 既定値 |
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
| `data-allowed-files` | `allowed_files` | `string(csv)` or `string[]` | `["index.md","404.md"]` を常に含む |
| `data-strict-root` | `strict_root` | `boolean` | `false` |
| `data-link-resolution` | `link_resolution` | `"relative"` or `"root"` | `"root"` |
| `data-allow-parent` | `allow_parent` | `boolean` | `false` |
| `data-query-path-mode` | `query_path_mode` | `"full"` or `"split"` | `"full"` |
| `data-execute-script` | `execute_script` | `boolean` | `false` |

注意:

- `data-status` は内部状態用で、設定用途ではありません。
- `inline_spa=true` の場合、`inline-spa` plugin は `data-plugins` に未指定でも自動追加されます。

### `data-plugins` で指定可能な組み込み名

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
- `auto-indexer`（`author-mode` の互換alias）

## `config.json` オプション

`config.json` は `<md-garden>` ごとに `this.option` にマージされます。  
次は実装で参照される主要キーです。

### viewer共通キー

| キー | 型 | 既定値 | 説明 |
|---|---|---|---|
| `html` | `boolean` | `false` | Markdown内HTMLを許可 |
| `sanitize` | `boolean` | `true` | DOMPurifyによるサニタイズ |
| `format` | `string` | `"markdown"` | 現在の通常表示フローでは実質未使用 |
| `spa` | `boolean` | `false` | include modeでクエリ遷移を有効化 |
| `inline_spa` | `boolean` | `false` | inline modeで`?page=`遷移を有効化 |
| `inline_spa_param` | `string` | `"page"` | inline SPA のクエリキー |
| `inline_page_attr` | `string` | `"data-page"` | inline templateのページ属性名 |
| `inline_default_page` | `string` | `""` | inlineページ解決時の既定ページ |
| `frontmatter` | `boolean` | `true` | frontmatter パース有効化 |
| `link_target` | `string` | viewer `id` | 遷移時に再描画する対象viewer |
| `allowed_dirs` | `string[]` or `string(csv)` | `[]` | include mode で許可する先頭ディレクトリ |
| `allowed_files` | `string[]` or `string(csv)` | `["index.md","404.md"]` | `strict_root=true` 時の単一ファイル許可リスト |
| `strict_root` | `boolean` | `false` | ルート直下参照の制限有効化 |
| `link_resolution` | `"relative"` or `"root"` | `"root"` | 相対/ルート基準の解決方針 |
| `allow_parent` | `boolean` | `false` | `..` 解決許可 |
| `query_path_mode` | `"full"` or `"split"` | `"full"` | URLクエリ形式 |
| `execute_script` | `boolean` | `false` | 描画後 `<script>` を有効化 |

### `plugins` キー（plugin個別設定）

`plugins` はオブジェクトです。現行で設定キーを解釈するのは `js-run` / `js-demo` / `search` です。

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

`plugins.<pluginName>` で使えるキー:

| キー | 型 | 説明 |
|---|---|---|
| `allowList` | `string[]` | 使用許可ライブラリ名。未指定時はレジストリ全許可 |
| `trustedOrigins` | `string[]` | `https` origin の許可追加。既定originに加算 |
| `libraries` | `object` | ライブラリ定義の追加/上書き |

`libraries.<name>` の形式:

| キー | 型 | 必須 | 説明 |
|---|---|---|---|
| `global` | `string` | 必須 | 参照するグローバル名 |
| `urls` | `string` or `string[]` | 必須 | 読み込みURL（`https` かつ trusted origin のみ有効） |

`plugins.search` のキー:

| キー | 型 | 既定値 | 説明 |
|---|---|---|---|
| `index_path` (`indexPath`) | `string` | `"search-index.json"` | 検索インデックスJSONの参照先。存在すれば優先利用 |
| `sitemap_path` (`sitemapPath`) | `string` | `"sitemap.json"` | `index_path` が無い/読めない場合のフォールバック参照先 |

### `author_mode` キー

Author Mode 系は `author_mode` 配下で指定します。後方互換として一部トップレベルキーも解釈されます。

| キー | 型 | 既定値 | 説明 |
|---|---|---|---|
| `author_mode.enabled` | `boolean` | `true`（`author_mode` 未指定時） / `false`（`author_mode` オブジェクトがあり `enabled` 省略時） | Author Mode 全体の有効/無効 |
| `author_mode.deploy` | `string[]` or `string` | `[]` | 本番URL判定に使うデプロイ先 |
| `author_mode.auto_indexer.enabled` | `boolean` | `false` | Auto Indexer有効化 |
| `author_mode.auto_indexer.strict` | `boolean` | `true` | 厳格モード |
| `author_mode.auto_indexer.frontmatter_fallback` | `boolean` | `false` | Front Matter 欠損時に `Last-Modified` / 先頭見出しで補完 |
| `author_mode.auto_indexer.mode` | `string` | `"include-only"` | 現在は `include-only` のみ有効 |
| `author_mode.auto_indexer.sitemap_path` | `string` | `"sitemap.json"` | sitemap パス |
| `author_mode.auto_indexer.db_prefix` | `string` | `"mdgarden_auto_indexer"` | IndexedDB名の接頭辞 |
| `author_mode.auto_indexer.pbkdf2_iterations` | `number` | `210000` | 鍵導出反復回数 |
| `author_mode.local_editor.enabled` | `boolean` | `false` | Local Editor有効化 |
| `author_mode.local_editor.auto_reload` | `boolean` | `true` | 保存後の自動再読込 |
| `author_mode.offline_export.enabled` | `boolean` | `true` | Offline Wiki export有効化 |
| `author_mode.offline_export.file_name` | `string` | `"bundle.html"` | 出力ファイル名 |
| `author_mode.offline_export.query_param` | `string` | `"page"` | 出力wikiのクエリパラメータ名 |
| `author_mode.offline_export.default_page` | `string` | `""` | 既定ページ |
| `author_mode.offline_export.viewer_id` | `string` | `""` | 出力対象viewer上書き |

後方互換キー（トップレベルで解釈）:

- `deploy`
- `auto_indexer`
- `local_editor`
- `offline_export`
- `inline_export`（`offline_export` の互換alias）

## 例

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
