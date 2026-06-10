\---

name: new-site

description: 新しい映画ページを1本作成する。映画タイトルを指定されたときに使用。データ収集→レビュー生成→ページ生成→SEO確認まで一気通貫で実行する。

allowed-tools:

&#x20; - Bash

&#x20; - Read

&#x20; - Write

\---



\# 新規映画ページ作成スキル



\## 実行前チェック

既存ファイルがある場合は絶対に上書きしない。



\## Step 1: 映画基本情報の収集

以下を収集する：

\- タイトル（日本語・英語）

\- 公開年・監督

\- 作曲家・代表曲

\- あらすじ（ネタバレなし）

\- ジャンル

\- YouTube予告編URL

\- 配信中のVODサービス



\## Step 2: JSONデータファイル作成

movies/data/\[slug].json を作成する。



\## Step 3: レビュー生成

音楽・音の視点を必ず入れる。

主観的・感覚的な表現を使う。

ネタバレは最小限。



\## Step 4: SEO確認

\- タイトルタグが32文字以内か

\- meta descriptionが100文字以内か

\- noindexが残っていないか

\- 構造化データが含まれているか



\## Step 5: published を true に変更



\## Step 6: サイトマップ更新



\## 完了後

git commit して Google Search Console で

インデックス登録をリクエストする。

