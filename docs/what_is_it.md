---
title: "MDGarden - What is it?"
lastModified: "2026-03-06T01:00:00+09:00"
indexing: true
---

# What is it?
MDGarden は、Markdown を中心にした軽量な Wiki / ドキュメント閲覧基盤です。  
サーバ側の複雑な処理に依存せず、ブラウザ内でレンダリングを完結できるため、配布・移設・検証をシンプルに保てます。

## 解決する課題

ドキュメント運用では、次のような課題が頻出します。

- 更新は簡単にしたいが、配布物は軽く保ちたい
- 単一ファイル配布と複数ファイル運用を使い分けたい
- ローカル検証と本番公開で同じコンテンツを扱いたい

MDGarden は、Markdown を正本とすることで編集体験を維持しながら、表示側をブラウザへ寄せて運用コストを下げる設計です。

## 主要コンセプト

MDGarden の中心は次の2モードです。

- `inline mode`: 1つのHTMLにコンテンツを内包する配布向けモード
- `include mode`: 複数 Markdown を分割管理する運用向けモード

どちらも `md-garden` コンポーネントを軸に動き、構成や用途に応じて同じ資産を再利用できます。

## 想定ユーザーとユースケース

- 個人ナレッジベースを静的に管理したい開発者
- 小規模チームで手軽にドキュメントサイトを公開したい運用者
- オフライン配布可能なマニュアルを作りたい制作者

とくに「Markdownのまま保守したいが、見た目と導線は整えたい」というケースと相性が良いです。

## 特徴

- ファイルベース運用（Git と相性が良い）
- 設定の見通しが良い（`config.json` と `data-*` 属性）
- plugin による拡張が可能（目次、グラフ、Author Mode など）
- Offline Wiki への書き出しで配布形態を増やせる

## できること / できないこと

できること:

- Markdown を中心にした表示・リンク遷移・ページ分割
- 単一ファイル配布と複数ファイル運用の両立
- ローカル編集支援（Author Mode）と sitemap 補助

できないこと（非ゴール）:

- CMS のような高度なユーザー管理・権限制御
- サーバサイド検索や大規模な動的データ処理
- 無制限の入力を安全に受け付けるマルチテナント運用

## 他方式との違い

静的サイトジェネレータと比べると、MDGarden は「ビルド結果を作る」より「ブラウザで直接読む」側に寄っています。  
CMS と比べると、サーバ機能を最小化し、Markdown と静的配信を中心に据えます。

そのため、運用の重心は「アプリ開発」より「コンテンツ管理と配布」に置かれます。

## 全体アーキテクチャ（概要）

- `md-garden`: レンダリング本体（表示・遷移・状態管理）
- `template[data-target]` / `template[data-page]`: inline コンテンツ定義
- `plugin`: イベント駆動で表示や運用を拡張
- `author-mode-plugin`: ローカル編集・sitemap・Offline Export を補助

この分離により、基礎表示と運用機能を段階的に導入できます。

## 次に読むページ

- はじめて使う場合: [Getting Started](getting_started.md)
- 単一ファイル配布をしたい場合: [Sigle File Wiki/inline mode](inline_mode.md)
- 複数ページ運用をしたい場合: [Multi File Wiki/include mode](include_mode.md)
- 運用時の安全性を確認したい場合: [Security](security.md)

## Back links
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
