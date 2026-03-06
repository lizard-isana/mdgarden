---
title: "MDGarden - Getting Started?"
lastModified: "2026-03-06T00:40:00+09:00"
indexing: true
---

# Getting Started
このページでは、MDGarden を最小構成で起動し、1ページ表示できるところまでを最短手順で説明します。

## 前提条件

- モダンブラウザ（Chrome / Edge / Firefox / Safari の最新版推奨）
- ローカルで静的ファイルを配信できる環境
- `index.html` と `index.md` を配置できる作業ディレクトリ

`file://` でも動く構成はありますが、最初はローカルサーバ経由での確認を推奨します。

## 最小構成

まずは次の3ファイルだけ用意します。

- `index.html`
- `index.md`
- `assets/js/mdgarden.min.js`（必要なCSS/JS一式）

`index.html` の最小例:

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="./assets/css/default.css">
  <script src="./assets/js/mdgarden.min.js"></script>
</head>
<body>
  <md-garden id="main" src="index.md"></md-garden>
</body>
</html>
```

## 最初の Markdown

`index.md` は Front Matter 付きで開始すると、後で Author Mode を使う時も移行しやすくなります。

```md
---
title: "Home"
lastModified: "2026-03-06T12:00:00+09:00"
indexing: true
---

# Hello MDGarden

This is your first page.
```

## config.json（任意だが推奨）

最初は次の程度で十分です。

```json
{
  "spa": true,
  "frontmatter": true,
  "link_target": "main"
}
```

必要に応じて `index.html` 側で `data-config="config.json"` を指定します。

## ローカルでの確認

1. ローカルサーバを起動
2. `http://localhost:xxxx/` を開く
3. `Hello MDGarden` が表示されることを確認

確認ポイント:

- タイトルと本文が表示される
- コンソールに `Failed to load markdown` が出ていない
- 相対パスのリンクが意図どおり遷移する

## 初期トラブルと対処

- `Not Found` が出る  
  `src` のパスと実ファイル名を確認
- `Failed to load markdown` が出る  
  ローカルサーバ経由で開いているか確認
- リンク遷移が崩れる  
  `link_target` と `id` の一致を確認
- include 構成でページが開けない  
  `allowed_dirs` / `allowed_files` の制約を確認

## 次のステップ

- 単一ファイルで配布したい: [Sigle File Wiki/inline mode](inline_mode.md)
- 複数ページを分割管理したい: [Multi File Wiki/include mode](include_mode.md)
- 機能を拡張したい: [Plug-ins](plugins.md)
- 編集運用を整えたい: [Author Mode](author_mode.md)

## Back links
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
