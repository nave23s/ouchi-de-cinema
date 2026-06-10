# SEOルール（インデックス促進・検索順位最大化）

## 最優先：新サイトのインデックス促進

### 1. robots.txt 確認（クロール許可）
以下の内容になっているか確認する：
User-agent: *
Allow: /
Sitemap: https://ouchi-de-cinema.com/sitemap.xml

Disallow: / になっていたら即修正。これが最多インデックス失敗原因。

### 2. noindex タグの確認
本番環境に以下が残っていないか確認：
<meta name="robots" content="noindex">

### 3. Google Search Console にサイトマップを送信
URL: https://search.google.com/search-console
サイトマップ → https://ouchi-de-cinema.com/sitemap.xml を追加

### 4. 新ページは毎回インデックス登録をリクエスト
Search Console → URL検査 → インデックス登録をリクエスト

## 映画ページのSEO必須要素

### タイトルタグ（32文字以内）
{映画タイトル} レビュー｜{特徴}【オウチ de CINEMA】
例：インセプション レビュー｜夢と音楽の迷宮体験【オウチ de CINEMA】

### meta description（100文字以内）
{映画タイトル}の見どころを音楽の視点でレビュー。
視聴方法、関連グッズ情報まで。ワンクリックで今すぐ視聴できます。

### 狙うキーワード（1ページ4種類）
1. [映画タイトル] レビュー
2. [映画タイトル] 音楽
3. [映画タイトル] どこで見れる
4. [映画タイトル] サウンドトラック

## URLの命名規則
/movies/[映画タイトルのローマ字]-[公開年]/
例：/movies/inception-2010/
    /movies/your-name-2016/

## 避けるべきミス
- noindex を本番環境に残さない
- アフィリエイトリンクに rel="nofollow sponsored" をつける
- 同じコンテンツを複数URLで公開しない