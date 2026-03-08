---
title: "MDGarden - Search Plugin"
lastModified: "2026-03-09T00:00:30+09:00"
indexing: true
---
# Search Plugin

このドキュメントは、現在の実装（`src/assets/js/plugins/search-plugin.js`）に基づいて、`search` plugin の仕様と使い方をまとめたものです。

## 概要

`search` plugin は Markdown ページをインデックス化し、`mdg-search` コンポーネント経由で全文検索を提供します。

- 検索 UI は `mdg-search`（ライトDOM）
- 検索対象は `include` / `inline(embedded)` の両モードに対応
- `include` モードでは `search-index.json` を優先利用
- `search-index.json` が無い場合は `sitemap.json` から各 Markdown を読んでフォールバック構築

## 有効化

### 1. plugin を有効化

```html
<md-garden
  id="main"
  src="index.md"
  data-plugins="toc,search,author-mode">
</md-garden>
```

### 2. 検索 UI を配置

```html
<mdg-search viewer-id="main"></mdg-search>
```

補足:

- `viewer-id` / `viewer` 属性で対象 viewer を指定（省略時は `main`）
- `mdg-search` が存在する場合、`search` 未指定でも自動登録されます
- `data-inline-spa="true"` の場合は `search` が自動追加されます

## `mdg-search` コンポーネント

利用可能属性:

- `viewer-id` (`viewer`): 対象 `md-garden` の id
- `placeholder`: 入力プレースホルダー（既定: `Search pages...`）
- `max-results`: 表示件数上限（既定: `24`）

状態:

- ready件数はテキスト表示ではなく `data-ready` 属性に反映
- インデックス構築中は `indexing...`
- API未接続時は `unavailable`
- 検索時は `一致件数/総件数`

挙動:

- クエリ空文字時は結果一覧を非表示
- 結果クリック時は入力・結果をクリアして遷移
- 遷移時は viewport を先頭へ戻します

## インデックス構築方式

### inline（embedded）モード

- `<template data-page="...">` 等の埋め込み Markdown を走査してインデックス化
- Front Matter / コードブロック / 記法を除去したテキストを検索対象化

### include モード

1. `plugins.search.index_path`（既定: `search-index.json`）を取得
2. 読み込み成功し `pages` が有効ならそれを採用
3. 失敗時は `plugins.search.sitemap_path`（既定: `sitemap.json`）へフォールバック
4. sitemap の `pages` を基に各 Markdown を読み、検索エントリを生成

補足:

- インデックスは初期化時と `content_loaded/content_reloaded` 時に更新
- 署名（signature）一致時は再構築をスキップし、不要な再読み込みを抑制

## 検索ロジック

- クエリは小文字化 + 空白正規化
- トークンは AND 条件（全トークン一致必須）
- スコアは `title/page` の完全一致・前方一致・部分一致と、最初の一致位置で加点
- 同点時は `page` の辞書順

## 設定（`config.json`）

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

- `index_path` (`indexPath`): 事前生成インデックス JSON のパス
- `sitemap_path` (`sitemapPath`): フォールバック用 sitemap パス

## Author Mode 連携（INDEX保存）

`author-mode` と `search` を同時有効化すると、`mdg-author` に `INDEX保存` が表示されます。

- 表示条件: search API が有効
- 活性条件: `AUTHOR_MODE` かつ `dirty=true`
- 実行 API: `window.MDGarden[viewerId].authorMode.saveSearchIndex(option?)`

主な出力:

- 既定ファイル名: `search-index.json`
- 形式: `version`, `generatedAt`, `source`, `pages`

## `search-index.json` 形式

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
- `s`: 前処理済み検索テキスト

`search` plugin 側は短縮キー（`p/t/s`）と通常キー（`page/title/text`）の両方を読めます。

## パフォーマンス指針

- ページ数が多いサイトは `search-index.json` を優先運用
- `s` は検索に不要な情報を省いて軽量化
- `INDEX保存` を更新フローに入れて、公開物とインデックスを同期

## トラブルシュート

- 常に `unavailable`:
  - `search` plugin が未有効、または `viewer-id` が不一致
- include モードで初回が重い:
  - `search-index.json` が無く、sitemap フォールバックで全 Markdown を読んでいる
- 結果が少ない/出ない:
  - `max-results` 設定、`indexing: false` ページ、または `s` の生成内容を確認
