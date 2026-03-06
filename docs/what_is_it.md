---
title: "MDGarden - What is it?"
lastModified: "2026-03-06T16:55:00+09:00"
indexing: true
---

# What is it?
MDGardenはブラウザ上で動作するMarkdownベースの軽量ドキュメントビュアー／Wikiエンジンです。  
静的なファイルのみで構成され、標準的なMarkdownをデータファイルとして使用します。
公開サーバ上では高機能のMarkdownビューアーとして動作し、
ローカルサーバではパーソナルナレッジベース／Wikiエンジンとして動作します。

## Document Viewer
公開サーバでは、静的な Markdown ファイルをリッチでインタラクティブなページに変換する高機能なドキュメントビューアーとして動作します。

### Dynamic Routing on Markdown 
Markdown 内に記述された相対リンクを解釈し、ブラウザのリロードを伴わない高速なページ遷移を実現します。フォルダ構造がそのまま Wiki の構造として機能するため、複雑なルーティング設定を必要とせず、リンクを辿るだけで膨大なドキュメントを自由に探索できます。

### Rich Content & Plugin Extensibility
標準的な Markdown 記法をベースとしながら、プラグインシステムにより表現力を自在に拡張できます。

- **数式・図表**: LaTeX による数式表示や、Mermaid 等によるグラフ・チャートの埋め込み。
- **インタラクティブ**: コードサンドボックスの統合による、実行可能なサンプルコードの提示。

Markdown のシンプルさを保ったまま、技術文書や研究ノートに必要なさまざまな表現を実現します。

### Static File Architecture
DBやサーバサイドスクリプトを一切持たない純粋な静的ファイル構成であるため、動的システム特有の脆弱性（SQLインジェクション等）が構造的に存在しません。GitHub Pages や S3 などのシンプルな静的ホスティング環境で、最高レベルのセキュリティと可用性を維持します。


## Wiki Engine
ローカルサーバ（localhost/127.0.0.1）では簡易編集やインデックス機能を備えたWikiエンジン／パーソナルナレッジベースとして動作します。また、プロジェクト全体をサーバレスで動作するシングルファイルWikiとして書き出すことができます。

### Indexing via Reading
一般的な Wiki や SSG と異なり、このシステムにはビルドという概念がありません。ブラウザが Markdown をフェッチして表示する際、その場でリンクを抽出し、既存の sitemap.json との差分を計算してバックリンク情報を更新します。閲覧することによってインデックスが記録・更新される仕組みになっています。

### Content Editing and Export
ローカル環境ではFile System Access APIを使って、ブラウザ上からMarkdownを直接編集する機能やプロジェクト全体を1つのHTMLとして書き出す機能を提供します。その際、ブラウザの制限により保存処理はローカルに対してのみ行われ、ブラウザとOS間のネイティブな機能だけで完結します。サーバ上では動的なプロセスは一切走らないため悪意のある第三者がファイルを改ざんするリスクは極めて小さくなります[^1]。
[^1]:通信系路上でのインジェクションや同一ブラウザ上の別プロセスからの介入などの可能性は避けられないためリスクはゼロにはなりません。

### Local-First Security & Permissions
セキュリティとデータの整合性を守るため、環境に応じて動作モードを自動的に切り替えます。

|環境 (Context)|モード|保存/更新|備考|
|---|---|---|---|
|localhost (127.0.0.1)|Author|有効|パーソナルナレッジベース|
|Public URL (Deploy)|Reader|無効|マルチファイル Wiki|
|file:// (Serverless)|Reader|手動|シングルファイル Wiki|


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
