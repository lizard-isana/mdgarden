---
title: "MDGarden - Author Mode"
lastModified: "2026-03-06T09:00:00+09:00"
indexing: true
---

# Author Mode
Author Mode は、ローカル環境での編集・索引更新・配布用書き出しをまとめて支援する運用モードです。  
公開サイトを直接書き換える仕組みではなく、ローカルでの作業効率を上げるための補助機能として設計されています。

## 有効条件

Author Mode は次の条件で有効になります。

- `localhost` または `127.0.0.1` で開いている
- 現在URLが `author_mode.deploy` で指定した公開URL配下ではない

この判定により、公開環境で誤って編集UIを出すリスクを減らします。

## 機能全体像

- `auto_indexer`: ページ情報を IndexedDB に蓄積し、`sitemap.json` を生成
- `local_editor`: 現在ページの Markdown を直接編集してローカル保存
- `offline_export`: include 構成を Offline Wiki（単一HTML）として書き出し

詳細仕様は [author_mode_plugin](author_mode_plugin.md) を参照してください。

## 想定ワークフロー

1. include mode でページを開く
2. 必要な Markdown を編集（local editor も可）
3. sitemap の差分を確認して保存
4. 必要に応じて Offline Wiki を書き出す
5. 最終確認後に Git へ反映して公開

編集・索引・配布を1つの流れで扱えるのが Author Mode の利点です。

## Auto Indexer

Auto Indexer は、レンダリングされたページ情報から sitemap を組み立てます。

- Front Matter の `lastModified` を基準に更新判定
- `indexing: false` のページは sitemap から除外
- `strict=true` の場合、`lastModified` が過去方向に戻る更新を拒否
- 本文ハッシュ比較（notify-only）により、`lastModified` 不変の本文変更を警告して更新漏れを検知

運用では、`lastModified` の記載ルールをチームで統一しておくと不整合を減らせます。

## Local Editor

Local Editor では、現在表示中 Markdown を textarea で編集して保存できます。

- 保存先は毎回ダイアログで選択
- `auto_reload` により保存後リロードを制御
- File System Access API 対応ブラウザが前提

「サーバへの直接書き込み」ではなく、あくまでローカルファイル操作です。

## Offline Export

Offline Export は sitemap 準拠でページを収集し、配布用HTMLを生成します。

- 内部リンクは `?page=` 形式へ変換
- 追加 viewer（header/footer 等）も同一HTMLへ同梱可能
- `src=*.md` の viewer は export 時に template 展開され、`file://` でも表示可能

## 設定項目の整理

設定は3層で決まります（後勝ち）。

1. `config.json` / タグ属性
2. Author Mode の実行時判定（local/deploy条件）
3. ランタイム上書き（IndexedDB の `runtimeOverride`）

ランタイム設定はブラウザストレージ削除で消える前提の揮発設定です。

## セキュリティ境界

- Author Mode は認証システムではない
- UI状態（`data-author` など）は権限制御ではない
- Local Editor はブラウザ権限に依存

他スクリプト共存時のリスクを下げるため、`execute_script` の扱いは慎重に運用してください。

## よくあるトラブル

- `lastModified moved backwards` が出る  
  既存値より新しい時刻に更新するか、`strict` 設定を見直す
- 保存ダイアログが想定どおり出ない  
  ブラウザ権限とユーザー操作起点（クリック）を確認
- Author Mode にならない  
  URL が localhost か、deploy 配下に入っていないか確認
- export 後に一部表示が崩れる  
  参照アセットや viewer ごとの設定差分を確認

## ベストプラクティス

- 作業前に Git 状態をクリーンにする
- `lastModified` 更新ルールを決める
- sitemap 保存前に差分をレビューする
- Offline 出力物に生成元コミットを記録する
- 本番公開前に `reader` 相当の表示確認を行う

## Back links
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
