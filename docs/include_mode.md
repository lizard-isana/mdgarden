---
title: "MDGarden - Multi File Wiki/include mode"
lastModified: "2026-03-06T09:00:00+09:00"
indexing: true
---

# Multi File Wiki/include mode
include mode は、Markdown を複数ファイルに分割して管理・運用したい場合の標準モードです。  
更新頻度が高いサイトや、ページ数が増えるプロジェクトでは inline mode より保守しやすくなります。

## 向いている用途

- 複数ページを継続的に更新したい
- Git でページ単位に差分管理したい
- 共通レイアウトと本文を分離したい

配布のしやすさ最優先なら inline mode、運用性重視なら include mode が基本方針です。

## 推奨ディレクトリ構成

最小例:

```text
docs/
  index.html
  config.json
  index.md
  getting_started.md
  include_mode.md
  assets/
    css/default.css
    js/mdgarden.min.js
```

必要に応じて `content/` などのサブディレクトリへページを分けます。

## 基本設定

`index.html` 側:

```html
<md-garden
  id="main"
  src="index.md"
  data-link-target="main"
  data-allowed-dirs="content"
  data-allowed-files="index.md,404.md"
  data-link-resolution="relative"
  data-allow-parent="true"
  data-query-path-mode="split">
</md-garden>
```

主要項目:

- `src`: 初期表示 Markdown
- `allowed_dirs` / `allowed_files`: 読み込み許可範囲
- `strict_root`: ルート参照を厳密化するか
- `link_resolution`: `relative` / `root` の解決方針
- `allow_parent`: `..` を許可するか
- `query_path_mode`: URL のクエリ形式

## リンク解決と URL 設計

include mode の遷移はクエリパラメータで管理されます。

- `full` モード: `?main=path/to/page.md`
- `split` モード: `?main=page.md&dir=path&subdir=to`

リンク運用が複雑になりやすい場合は、まず `full` で始め、必要になってから `split` へ移行すると安全です。

## レイアウトとの組み合わせ

`header` / `footer` などを別 `md-garden` として置く構成も可能です。  
この場合は `id` と `data-link-target` の対応を明確にし、どの viewer が主導でページ遷移するかを固定してください。

## よくあるエラーと対処

- `Blocked target path`  
  `allowed_dirs` / `allowed_files` / `allow_parent` を確認
- `Not Found`  
  `src` と実ファイル配置、拡張子 `.md` を確認
- 意図しないページが開く  
  `link_resolution` と `query_path_mode` の組み合わせを確認
- 遷移URLが長い / 分かりにくい  
  `split` / `full` の方式を再検討

## inline mode との使い分け

- include mode: 運用・更新・分割管理に強い
- inline mode: 配布・持ち運び・単体共有に強い

まず include mode で管理し、配布時に Offline Wiki（inline）へ書き出す流れが実運用では扱いやすい構成です。

## Back links
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
