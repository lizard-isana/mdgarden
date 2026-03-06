---
title: "MDGarden - Single File Wiki/inline mode"
lastModified: "2026-03-06T13:30:00+09:00"
indexing: true
---

# Single File Wiki/inline mode
inline mode は、1つのHTMLにコンテンツを同梱して配布したいときに使うモードです。  
オフライン共有、簡易マニュアル、配布用ドキュメントに向いています。

## 向いている用途

- 単一ファイルで配布したい
- `file://` でも閲覧可能にしたい
- サーバ側の設定を増やしたくない

ページ数が多く、更新頻度も高い場合は include mode の方が保守しやすくなります。

## 基本構成

inline mode では `src` を使わず、`template[data-target]` に本文を書きます。

```html
<md-garden
  id="main"
  data-inline-spa="true"
  data-inline-spa-param="page"
  data-frontmatter="true"
  data-sanitize="true"
  data-html="true">
</md-garden>

<template data-target="main">
---
title: "Home"
lastModified: "2026-03-06T12:00:00+09:00"
indexing: true
---

# Home
Welcome to inline mode.
</template>
```

## 複数ページ化

複数ページを持たせる場合は `template[data-page]` を追加します。

```html
<template data-page="home.md" data-page-target="main">
# Home
[Open Guide](?page=guide.md)
</template>

<template data-page="guide.md" data-page-target="main">
# Guide
[Back to Home](?page=home.md)
</template>
```

`data-page-target` で対象 viewer を明示すると、複数 `md-garden` 構成でも混線しにくくなります。

## ページ遷移の仕組み

- `data-inline-spa="true"` でクエリ遷移を有効化
- `data-inline-spa-param="page"` でクエリキーを指定
- URL は `?page=guide.md` のように切り替わる

初期ページを固定したい場合は `data-inline-default-page="home.md"` を使います。

## 推奨設定

- `data-frontmatter="true"`: metadata を使う場合
- `data-sanitize="true"`: まずは安全側
- `data-html="true"`: HTML併用が必要なときのみ
- `data-execute-script="false"`: 原則維持

## セキュリティ上の注意

inline mode は配布が簡単な一方、HTML内に script を入れると攻撃面積が増えます。  
外部提供コンテンツを混ぜる場合は、`sanitize=true` と `execute_script=false` を基本にしてください。

## 制約とトレードオフ

- ページ数が増えるほど1ファイルが肥大化する
- 差分レビューが読みにくくなる
- 複数人編集では競合しやすい

「配布性重視なら inline」「運用性重視なら include」と覚えると判断しやすいです。

## Author Mode からの書き出し

MDGarden では include mode で運用し、Author Mode の `offline_export` で inline 形式（Offline Wiki）へ書き出す使い方ができます。  
この方法を使うと、日常運用は分割管理のまま、配布時だけ単一HTMLを生成できます。

- 運用: include mode + auto_indexer
- 配布: Author Mode の「書き出し」ボタンで Offline Wiki 生成
- 生成物: `?page=` 遷移を含む単一HTML（viewer構成も同梱可能）
- 詳しくは [Author Mode](author_mode.md) を参照してください

## 次のステップ

- 分割管理へ移行する: [Multi File Wiki/include mode](include_mode.md)
- plugin を追加する: [Plug-ins](plugins.md)
- ローカル編集や書き出しを使う: [Author Mode](author_mode.md)

## Back links
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
