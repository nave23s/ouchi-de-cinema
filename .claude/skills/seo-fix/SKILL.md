---
name: seo-fix
description: SEOとAIO(AI検索最適化)の問題を一括チェック・修正する。「インデックスされない」「SEOを確認して」「サイトマップを更新して」「AIに引用されたい」「構造化データを確認して」と言われたら必ずこのスキルを使う。静的サイト(GitHub Pages)専用。
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
---

# SEO・AIO一括チェック・修正スキル(静的サイト版)

**CLAUDE.mdの作業フローを厳守。本サイトはGitHub Pagesの静的HTML。Next.js等のフレームワーク前提のチェックは行わない。**

## Step 0: 構造確認

HTMLファイルの配置・テンプレートの場所・sitemap.xml と robots.txt の位置を確認する。食い違いがあれば報告して停止。

## ★ 最優先チェック(インデックスされない原因)

### 1. robots.txt — クロールブロックとAIクローラー許可
確認ポイント:
- `Disallow: /` になっていないか
- **AIクローラーがブロックされていないか**: GPTBot / ClaudeBot / Google-Extended / PerplexityBot / CCBot(AI検索からの引用に必須)

正しい内容の例:
```
User-agent: *
Allow: /
Sitemap: https://ouchi-de-cinema.com/sitemap.xml
```

### 2. noindex の残存
全HTMLを対象に `grep -rl "noindex" --include="*.html"` で検出。

### 3. sitemap.xml の存在と網羅性
- レビューページ + ハブページ + 固定ページが全件含まれているか
- movies.json の公開件数と sitemap のURL数を突合して差分を報告

### 4. canonical タグ
全ページに正しい canonical があるか。重複コンテンツ(Type Bのレガシー URL等)は正規URLを指しているか。

## 全ページ一括チェック(scripts/seo-check.js)

**初回のみスクリプトを新規作成する**（`scripts/seo-check.js` は未存在）。作成後は以降これを実行する。チェック項目:

- [ ] title タグ(32字以内・重複なし)
- [ ] meta description(100字以内・重複なし)
- [ ] OGP / Twitter Card タグの有無
- [ ] GA4(G-NQYTVV8D13)の設置
- [ ] canonical の有無と正しさ
- [ ] JSON-LD構造化データの有無(下記参照)
- [ ] 著者バイラインの有無
- [ ] リンク切れ(内部リンク)
- [ ] alt属性のない画像

結果は「問題種別ごとの件数+該当ページ上位10件」の形式で報告する。

## AIO対応チェック(AI検索で引用されるための項目)

### 構造化データ(JSON-LD)
- レビューページ: `Movie` + `Review`(author に Person、reviewRating を含む)
- ハブページ: `Person` + `CollectionPage`
- サイト全体: `Organization` または `Person`(運営者情報)
- FAQ設置ページ: `FAQPage`

### コンテンツ構造
- [ ] 冒頭300字以内に結論(verdict)があるか
- [ ] FAQセクションがあるか
- [ ] 見出し(h2/h3)が質問形式または内容を端的に表すラベルになっているか
- [ ] 著者プロフィールページが存在し、全ページからリンクされているか

## サイトマップ再生成

`scripts/generate_sitemap.js` で movies.json とハブページから自動生成する。lastmod は各エントリーの更新日を使用。生成後、URL件数を報告。

## SEO修正後のアクション(ユーザーに案内)

1. デプロイ後、Google Search Console → サイトマップ再送信
2. 重要ページはURL検査ツールでインデックス登録リクエスト
3. 24〜72時間後にインデックス状況を確認
4. AI検索での引用確認: ChatGPT / Perplexity / Gemini に「映画の音楽レビューサイト」「(作品名) 音楽 レビュー」等で質問し、サイトが引用されるかを月1回記録する
