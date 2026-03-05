---
title: "author mode"
lastModified: "2026-03-05T22:00:00+09:00"
indexing: true
---

# author_mode / auto-indexer / local-editor ガイド

このドキュメントは、現在の実装（`src/assets/js/plugins/author-mode-plugin.js`）に基づく利用手順です。

## 概要

`author-mode-plugin` は `author_mode` の一部として動作します。

主な機能:

- `auto_indexer`: ページ情報を `IndexedDB` に増分保存し、必要時に `sitemap.json` を出力
- `local_editor`: 現在表示中の Markdown を textarea で編集し、File System Access API でローカル保存
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
      "sitemap_path": "sitemap.json",
      "db_prefix": "mdgarden_auto_indexer_docs"
    },
    "local_editor": {
      "enabled": true,
      "auto_reload": true
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
- 不正または未設定時は更新停止し、dirty を維持
- `indexing: false` の場合は既存エントリを削除

## Author パネル UI

`<mdg-author ...>` は Author パネルとして以下を提供します。

- `保存`: sitemap 保存
- `設定`: ステータス
- `編集`: local editor（`author_mode.local_editor.enabled=true` のとき）

`auto-hide="true"` でも、local editor が有効な `AUTHOR_MODE` では編集導線を維持するためパネルは表示されます。
`<mdg-author auto-save="...">` の自動保存機能は廃止され、保存は常に手動実行です。

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

## 実行時 dataset

`<html>` の `dataset` に状態が反映されます。

- `data-auto-indexer-mode`: `reader` / `author`
- `data-auto-indexer-state`: `normal` / `init-required` / `recovery-required` / `error`
- `data-auto-indexer-dirty`: `true` / `false`
- `data-local-editor-enabled`: `true` / `false`
- `data-local-editor-ready`: `true` / `false`
- `data-current-path`: 現在ページの正規化パス
- `data-author`: `author` 時のみ `"true"`

## JavaScript API

`MDGarden[viewerId].authorMode`:

（後方互換として `MDGarden[viewerId].autoIndexer` も同一APIを参照可能）

- `getStatus()`
- `getSitemap(option)`
- `saveSitemap(option)`
- `openLocalEditor()`
- `saveLocalEditor(markdown, option)` (`option.autoReload` / `option.reload` で呼び出し時に上書き可)

例:

```js
const api = MDGarden.main.authorMode;
const opened = await api.openLocalEditor();
await api.saveLocalEditor(opened.content);
```

## 注意事項

- 認証/認可を提供するものではありません。
- `data-author` は UI 切り替え用であり、信頼境界ではありません。
- `auto_indexer.mode` は `include-only` を前提とします。

## UI/UX 見直しポイント

- Author パネルは「編集」「保存（sitemap）」「設定」を同一導線に集約
- `AUTHOR_MODE` では `auto-hide` 有効時でも編集導線を維持
- ステータス行は最小表示（`current-path` 中心）で、`sitemap changed` / `error` / `editor:unavailable` など必要時のみ追加表示
- Author認証は「localhost/127.0.0.1 かつ deploy配下外」に簡素化
