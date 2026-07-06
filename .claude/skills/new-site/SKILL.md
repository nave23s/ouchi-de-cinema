---
name: new-site
description: 新しい映画をデータベースに登録し、ページを1本作成する。映画タイトルを指定して「登録して」「ページを作って」「追加して」と言われたら必ずこのスキルを使う。監督・作曲家・主題歌アーティストの手動登録フローを含む。複数本の場合はbatch-generateを使う。
allowed-tools:
  - Bash
  - Read
  - Write
  - WebSearch
---

# 新規映画登録スキル(手動登録フロー対応)

**CLAUDE.mdの作業フローを厳守。既存エントリーの上書きは絶対禁止。**

## Step 0: 重複チェック

movies.json 内にタイトル・slugの重複がないか確認する。類似タイトル(リメイク・シリーズ)がある場合は提示して確認。シリーズ作品は「1エピソード = 1ページ」を厳守。

## Step 1: コアデータの手動登録(新運用)

ユーザーに以下を **1回の質問でまとめて** 確認する:

```
以下を教えてください(わかる範囲でOK、空欄は私が検索で補完し確認を取ります):
1. 監督:
2. 作曲家(劇伴):
3. 主題歌・挿入歌のアーティストと曲名:
4. ジャンル(候補: [genres.jsonのリストを表示]):
5. 公開年:
```

- ユーザー入力が最優先。入力された値はマスター照合のみ行い、Web検索で上書きしない
- 空欄項目のみWeb検索で補完し、**補完した値は出典と共に提示して承認を得る**

## Step 2: マスター照合

- 作曲家・アーティスト名を data/masters/ と照合
- 表記ゆれの疑い(例: 入力「久石 譲」/ マスター「久石譲」)はマスター表記への統一を提案
- 新規の名前はマスター追加を提案(slug案つき)

## Step 3: movies.json へのエントリー追加

既存エントリーと同じフィールド構造で追加する(**既存フィールドの改名は絶対禁止。新情報は新フィールドとして追加**)。
`n` は現在の最大値+1を使う。

```json
{
  "n": "[現在の最大n+1]",
  "t": "日本語タイトル",
  "english_title": "English Title",
  "d": "",
  "s": false,
  "y": "https://www.youtube.com/results?search_query=[タイトル]%20予告",
  "yt": "s",
  "slug": "[english-title-yyyy]",
  "director": "",
  "genre": [],
  "music": {
    "composer": [],
    "artists": [{"name": "", "song": "", "role": "主題歌"}]
  },
  "catchphrase": "",
  "verdict": "",
  "faq": [],
  "seo": {"meta_title": "", "meta_description": ""},
  "review_generated": false
}
```

フィールド意味はCLAUDE.mdの「movies.json フィールド対応表」を参照。

## Step 4: レビュー生成(1本のみの場合)

batch-generate スキルと同じ出力形式(verdict冒頭・FAQ付き・音楽言及必須)で生成し、`d`・`verdict`・`catchphrase`・`faq`・`seo` 各フィールドに書き込む。
**2本以上たまっている場合は生成せず、batch-generate の使用を提案する。**

## Step 5: ページ生成とチェック

テンプレートからページを生成し、以下を確認:
- [ ] title 32字以内 / meta description 100字以内
- [ ] OGP / Twitter Card / GA4 / canonical
- [ ] Movie + Review のJSON-LD
- [ ] 著者バイライン
- [ ] noindex が残っていないか

## Step 6: ハブ・サイトマップとの整合

- 該当する作曲家・アーティスト・ジャンルのハブページを更新(hub-generate)
- sitemap.xml を更新

## Step 7: サンプル確認→コミット(承認後のみ)

生成ページを提示し、承認後にコミット。メッセージ例: 「『(タイトル)』ページ追加」。push は報告後。
