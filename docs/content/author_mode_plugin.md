---
title: "author mode"
lastModified: "2026-03-06T00:40:00+09:00"
indexing: true
---

# author_mode / auto-indexer / local-editor / offline-export ガイド

このドキュメントは、現在の実装（`src/assets/js/plugins/author-mode-plugin.js`）に基づく利用手順です。

## 概要

`author-mode-plugin` は `author_mode` の一部として動作します。

主な機能:

- `auto_indexer`: ページ情報を `IndexedDB` に増分保存し、必要時に `sitemap.json` を出力
- `local_editor`: 現在表示中の Markdown を textarea で編集し、File System Access API でローカル保存
- `offline_export`: include モードのサイト一式を single-file の Offline Wiki HTML として書き出し
- いずれも `AUTHOR_MODE` で有効

## 事前設定（推奨）

`config.json` で `author_mode` を設定します。

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

補足:

- `author_mode` 未設定時は、従来の `deploy` / `auto_indexer` も後方互換で解釈されます。
- `AUTHOR_MODE` 判定は次の2条件のみです。
- `localhost` または `127.0.0.1` で開いていること
- 現在URLが `deploy` で指定した公開URL配下ではないこと

## Front Matter の要件（auto_indexer）

対象ページには `lastModified` を入れてください。

```yaml
---
title: "ページタイトル"
lastModified: "2026-03-01T12:00:00Z"
indexing: true
---
```

- `lastModified` は RFC3339（タイムゾーン必須）
- `frontmatter_fallback=true` の場合、`lastModified` 欠損時に HTTP `Last-Modified` を補完
- `title` 未指定時は既定で `"Untitled"`（`frontmatter_fallback=true` の場合は描画rootの先頭見出しを補完）
- 不正または未設定時は更新停止し、dirty を維持
- 本文の SHA-256 ハッシュ比較（notify-only）を行い、`lastModified` が同じまま本文だけ変化した場合は `dirty=true` と警告を出して更新を促します
- `indexing: false` の場合は既存エントリを削除

## Author パネル UI

`<mdg-author ...>` は Author パネルとして以下を提供します。

- `保存`: sitemap 保存
- `INDEX保存`: 検索用インデックス（`search-index.json`）を保存（search plugin有効時のみ表示）
- `書き出し`: include モードサイトを single-file HTML に export
- `ステータス`: ステータスを表示
- `編集`: local editor（`author_mode.local_editor.enabled=true` のとき）

`auto-hide="true"` でも、local editor が有効な `AUTHOR_MODE` では編集導線を維持するためパネルは表示されます。
`<mdg-author auto-save="...">` の自動保存機能は廃止され、保存は常に手動実行です。

設定パネル内の「ランタイム設定（IndexedDB上書き）」では、初期化後でも安全に反映できる項目のみ変更できます。

- `auto_indexer.strict`
- `local_editor.enabled`
- `local_editor.auto_reload`
- `offline_export.enabled`
- `offline_export.file_name`
- `offline_export.query_param`
- `offline_export.default_page`
- `offline_export.viewer_id`

この上書き値は `IndexedDB`（`config.runtimeOverride`）に保存され、`config.json` / タグ属性より優先されます。
ブラウザの IndexedDB を削除すると上書き設定も消えます。

## Local Editor のフロー

1. `編集` ボタンを押す
2. 現在表示中 Markdown を textarea に展開
3. 編集
4. `編集内容を保存` を押す
5. File System Access API でローカル保存
6. （`auto_reload: true` の場合）ページをリロード

制約:

- `AUTHOR_MODE` でのみ利用可能
- `include` モード前提
- File System Access API 非対応ブラウザでは利用不可

`local_editor` の主なオプション:

- `enabled`: local editor の有効化
- `auto_reload`: `編集内容を保存` 後の自動リロードを有効化（既定: `true`）
  - `false` にすると保存後の自動リロードを無効化できます
  - 旧設定 `reload_after_save` は後方互換として引き続き解釈されます
- 保存ダイアログは常に表示され、毎回 `showSaveFilePicker` で保存先を選択します（auto-save は廃止）

## Offline Wiki Export のフロー

1. `書き出し` ボタンを押す
2. sitemap（live DB）を取得し、`pages` の各Markdownを読み込む
3. sitemap 準拠でページを収集し、内部リンクを `?page=` 形式へ変換
   - `list{.auto-indexer-page-list ...}` / `backlinks{.auto-indexer-backlinks ...}` は export 時に静的リンクリストへ展開
4. 1ファイルの Offline Wiki HTML を生成
5. `showSaveFilePicker`（非対応時はBlobダウンロード）で保存

制約:

- `AUTHOR_MODE` かつ include モードでのみ利用可能
- export対象は sitemap 準拠（`indexing: false` は除外）
- アセット（画像/CSS/JS）は外部参照のまま（HTML内に同梱しない）
- ページ内に複数 `md-garden` がある場合、主viewer（`mdg-author` の `viewer-id`）をOffline化しつつ、他viewerも同一HTMLへ同梱します
- 追加viewerの `src=*.md` は export 時に template 展開されるため、`file://` でも表示できます（リンクは `?page=` 形式へ変換）

`offline_export` の主なオプション:

- `enabled`: export機能を有効化（既定: `true`）
- `file_name`: export時の既定ファイル名（既定: `bundle.html`）
- `query_param`: Offline Wiki のページ遷移クエリ（既定: `page`）
- `default_page`: 初期表示ページ（未指定時は現在ページ→`index.md`→先頭の順に自動決定）

## 実行時 dataset

`<html>` の `dataset` に状態が反映されます。

- `data-auto-indexer-mode`: `reader` / `author`
- `data-auto-indexer-state`: `normal` / `init-required` / `recovery-required` / `error`
- `data-auto-indexer-dirty`: `true` / `false`
- `data-local-editor-enabled`: `true` / `false`
- `data-local-editor-ready`: `true` / `false`
- `data-export-enabled`: `true` / `false`
- `data-export-ready`: `true` / `false`
- `data-current-path`: 現在ページの正規化パス
- `data-author`: `author` 時のみ `"true"`

## JavaScript API

`MDGarden[viewerId].authorMode`:

（後方互換として `MDGarden[viewerId].autoIndexer` も同一APIを参照可能）

- `getStatus()`
- `getRuntimeSettings()`
- `setRuntimeSettings(settings)`
- `resetRuntimeSettings()`
- `getSitemap(option)`
- `saveSitemap(option)`
- `saveSearchIndex(option)` (`option.fileName` / `option.file_name`)
- `openLocalEditor()`
- `saveLocalEditor(markdown, option)` (`option.autoReload` / `option.reload` で呼び出し時に上書き可)
- `exportOfflineWiki(option)` (`option.fileName` / `option.queryParam` / `option.defaultPage` / `option.viewerId`)
  - 旧API `exportInlineWiki(option)` も後方互換として利用可能

例:

```js
const api = MDGarden.main.authorMode;
const opened = await api.openLocalEditor();
await api.saveLocalEditor(opened.content);
await api.saveSearchIndex({ fileName: "search-index.json" });
await api.exportOfflineWiki({ fileName: "bundle.html" });
```

## 注意事項

- 認証/認可を提供するものではありません。
- `data-author` は UI 切り替え用であり、信頼境界ではありません。
- `auto_indexer.mode` は `include-only` を前提とします。

## UI/UX 見直しポイント

- Author パネルは「編集」「保存（sitemap）」「設定」を同一導線に集約
- Includeサイトの配布向けに「Offline Wiki 書き出し」を追加
- `AUTHOR_MODE` では `auto-hide` 有効時でも編集導線を維持
- ステータス行は最小表示（`current-path` 中心）で、`sitemap changed` / `error` / `editor:unavailable` / `export:unavailable` など必要時のみ追加表示
- Author認証は「localhost/127.0.0.1 かつ deploy配下外」に簡素化
