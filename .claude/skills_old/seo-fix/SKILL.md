\---

name: seo-fix

description: SEOの問題を一括チェック・修正する。「インデックスされない」「SEOを確認して」「サイトマップを更新して」と言われたときに使用。

allowed-tools:

&#x20; - Bash

&#x20; - Read

&#x20; - Write

\---



\# SEO一括チェック・修正スキル



\## 最優先チェック（インデックスされない原因TOP5）



\### 1. robots.txt の確認

正しい内容：

User-agent: \*

Allow: /

Sitemap: https://ouchi-de-cinema.com/sitemap.xml



Disallow: / になっていたら即修正。



\### 2. noindex タグの確認

本番環境に以下が残っていないか確認：

<meta name="robots" content="noindex">



\### 3. サイトマップの確認

sitemap.xml が存在するか確認。

全ページのURLが含まれているか確認。



\### 4. canonical タグの確認

全ページに正しいcanonicalタグがあるか確認。



\### 5. 構造化データの確認

schema.org の Movie スキーマが含まれているか確認。



\## SEO修正後のアクション



1\. デプロイしてから確認

2\. Google Search Console でサイトマップを再送信

3\. URL検査ツールで主要ページをインデックス登録リクエスト

4\. 24〜72時間後にインデックス状況を確認

