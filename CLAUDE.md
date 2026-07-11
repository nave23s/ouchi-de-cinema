# オウチ de CINEMA — Claude Code プロジェクト設定

## このプロジェクトの絶対ルール

1. 1映画タイトル = 1ページを原則とする
2. コスト最優先：不要なAPI呼び出しを絶対にしない
3. 作業前に必ず計画を日本語で説明してから実行する
4. git pushは確認なしに実行しない

## プロジェクト概要

- サイト名：オウチ de CINEMA（ouchi-de-cinema.com）
- コンセプト：映画の音楽・音・主観レビューで作品の魅力を伝え、ワンクリックで視聴へ誘導するアフィリエイトサイト
- 規模目標：3,000ページ
- 収益モデル：Amazonアソシエイト・VODアフィリエイト

## 技術スタック

- 静的HTML（GitHub Pages）
- データ管理：movies.json
- デプロイ：GitHub Pages（nave23s/ouchi-de-cinema）

## ページの必須要素

各映画ページに必ず含めるもの：
1. タイトル・キャッチコピー
2. 独自レビュー（音楽・音の観点）
3. YouTube予告編リンク
4. 視聴できるVODサービス一覧（アフィリエイトリンク）
5. Amazon アフィリエイト（Blu-ray・サントラ）
6. 関連映画リンク

## コスト削減の鉄則

詳細は @.claude/rules/cost-control.md を参照

## SEO必須事項

詳細は @.claude/rules/seo.md を参照

## コンテンツ品質

詳細は @.claude/rules/content-quality.md を参照

## データ管理

詳細は @.claude/rules/data-architecture.md を参照

---

# 作業引き継ぎメモ（2026-06-22時点）

次回チャット・別セッションでもここから即続行できるようにするための引き継ぎ。

## プロジェクト基本情報

- サイト名：オウチ de CINEMA（ouchi-de-cinema.com）。コンセプトは「音と音楽で映画を語る」
- リポジトリ：nave23s/ouchi-de-cinema（GitHub Pages、ルート公開）
- Amazonアソシエイト：ouchidecinama-22
- 作業環境：Windows + iPhone。Claude Code起動時は必ず `cd C:\Users\USER\ouchi-de-cinema` してから作業する

## movies.json フィールド対応表（実構造・変更禁止）

| フィールド名 | 意味 | 型 | 備考 |
|---|---|---|---|
| `n` | 管理番号 | number | 一意のID。重複禁止 |
| `t` | タイトル（日本語） | string | 表示用タイトル |
| `d` | レビュー本文 | string | 手書きレビュー。空=未記入 |
| `s` | 特集フラグ | boolean | true=長文レビューあり |
| `y` | YouTube予告編URL | string | 通常は検索URL |
| `yt` | YouTube URL種別 | string | `"s"`=検索URL / `"d"`=直接URL |
| `english_title` | 英語タイトル | string | スラッグ生成の元になる |
| `slug` | URLスラッグ | string | 存在=公開済み。例: `inception-2010` |
| `series` | シリーズ名 | string | シリーズものに付与 |
| `episode` | エピソード番号 | string | 例: `S1E1`。シリーズものに付与 |

**新規追加フィールド（今後追記する項目）：**

| フィールド名 | 意味 | 型 |
|---|---|---|
| `director` | 監督名 | string |
| `genre` | ジャンル | array |
| `music.composer` | 作曲家（劇伴） | array |
| `music.artists` | 主題歌アーティスト | array |
| `catchphrase` | キャッチフレーズ | string |
| `verdict` | レビュー冒頭結論文 | string |
| `faq` | FAQ | array |
| `seo.meta_title` | SEOタイトル | string |
| `seo.meta_description` | meta description | string |
| `review_generated` | AI生成済みフラグ | boolean |
| `vod_services` | 配信VODサービス一覧 | array |
| `vod_checked` | VOD確認日 | string |

**鉄則：既存フィールドの改名は絶対にしない。新情報は新フィールドとして追加する。**

## 現状（2026-07-10時点）

- 公開：811本（slug付き）
- データ：movies.json（2489件）。各エントリ `{n,t,d,s,y,yt,english_title,slug}`（シリーズものは `series`,`episode` フィールドも付与）
- 著者本人の長文レビュー14本を公開済み（n=2720〜2730等）
- サイトの数字は「3,000本以上」に統一、Aboutを書き手プロフィールに変更済み
- **n重複227組（475件）を解消済み**（248件のnを再割当、公開済み21件のREVIEW No.ラベルも更新）
- **OGP対応完了**：ogp.jpg作成・index.html 404解消、個別映画ページ799本＋list.htmlにOGP/Twitter Cardタグ追加
- **重複コンテンツ36件（旧numericページ）削除済み**（slug版は保持）
- **一時ファイル整理・.gitignore整備**でリポジトリをクリーン化
- **Google Formsレビュー投稿システム実運用化**：フォーム送信→CSV→import_form_responses.jsでmovies.json反映→HTML自動再生成まで一気通貫
- **シリーズナビゲーション機能実装**：movies.jsonに `series`/`episode` フィールドを設定すると各話ページに全話リンクが自動付与される
- **シリーズもの調査完了**：56シリーズ・のべ718エントリ（series_groups.md）
- **アイアン・シェフ ブラジル編 全8話を公開**（シリーズもの公開のモデルケース）
- series_pending分の話数確定：DR.STONE 4件、ブルーロック 2件、ストリートグルメ サルバドール編=S1E2
- **データ埋め戻し開始**：backfill-dataスキルで第1〜3バッチ（計31件）にdirector/genre/musicを追加。マスター：composers.json 23名・artists.json 9名
- **スキル体系整備（計9スキル）**：affiliate-insert / backfill-data / batch-generate / hub-generate / import-reviews / json-guard / new-site / seo-fix / site-audit
- **json-guardスキル新設**：movies.jsonのバックアップ（backups/フォルダ、.gitignore済み）と整合性チェック
- **site-auditスキル新設**：サイト全体健康診断。初回実行で欠落4件・YouTube URL異常3件を検出
- **audit対応**：欠落4ページ（almost-famous-2000等）を生成、yt修正（n=2724/2728を"s"→"d"）
- **お手本4本slug版統合完了**（2026-07-10）：n=101/303/1100/2176のslug版に数値版のカスタムtitle・music-wrapperコンテンツを移植。canonicalの応急処置を解消し、slug版を正規URL（自己参照canonical）に確定。site-audit再実行で全782件のcanonical自己参照OK・重大ゼロを確認

## シリーズもの標準公開手順（アイアン・シェフ方式）

1. 各話レビューを整備（d, s, yt 等を入力）
2. movies.jsonに `series`（シリーズ名）と `episode`（`S1E1` 形式）を設定
3. slug を付与して公開 → シリーズナビが自動生成される

## 次にやること（優先順）

### 最優先
1. **スキル整備の続き**：bear-import等、未作成スキルの追加整備（未作成約9個）。または他業務フォルダの立ち上げ

### 保留中
2. **n=1409 幽霊エントリー**：t/d/yがすべて空。削除または補完の判断待ち
3. **n=2720 yフィールド調査**：VideoMarket URLが誤入力されている（yt="s"なのに全く別サービスのURL）。正しいYouTube URLを確認して修正
4. **レガシー71件（数値URLページ）**：うち4件はslug版統合済み（101/303/1100/2176）、残り67件はslug未付与。typeb-migrateとして今後整理

### 中期
5. 大型シリーズの全話マスターリスト作成（DR.STONE、ブルーロック等）
6. レビューが揃っているシリーズの公開（series/episode付与→公開）
7. 状態2（断片）・状態3（空）のレビュー充実
8. Apps Scriptの自動化設定（form_updater.gs）
9. afb・バリューコマース登録とVOD案件提携（収益化）
10. Music Review Coming Soon ページの実レビュー化

## 重要な決定事項

- URL：英題スラッグ＋年。海外作品＝原題、邦画で公式英題あり＝英題、なし＝ローマ字、シリーズ各話＝保留
- 英題確定はユーザーが「作品名 英語タイトル」で調べる方が速い→ユーザー担当
- 未来のレビューはユーザー本人が書く。過去の断片・空はAI補完（仮、後で本人が書き直す）
- **お手本6本のSKIP_N方針（確定版）**：generate_slug_pages.jsのSKIP_N（303,101,2176,2719,1239,1100）は維持。数値版が高品質手作りページのため自動再生成しない。n=2719/1239はslugなし・数値版のみ存在。n=101/303/1100/2176はslug版統合済み＝slug版が正規URL（自己参照canonical）・数値版も自己参照canonicalで独立存在。応急処置は解消済み
- **backups/フォルダ運用**：json-guardスキルで随時バックアップ。.gitignoreで除外済み
- **yt フィールド**：youtu.be/直接URLは必ず `"d"`、youtube.com/results検索URLは `"s"`
- プロフィール文（決定版・index.html掲載済み）：
  > 3歳から劇団の子役。10代まで、舞台の上にいました。
  > 客席に届くのは、セリフだけじゃない。足音、衣擦れ、息づかい、そして幕が下りる前の、あの一瞬の静寂。舞台は、音でできていました。
  > スパッと引退して、観る側へ。1999年から数えて、オウチで観た作品は3,000本オーバー。
  > 演じる側にいた人間だけど、語りたいのは演技論じゃないんです。気になるのは、いつも"音"。サントラ、劇伴、足音、沈黙。あの曲が流れた瞬間に、なぜ涙が出たのか。
  > 舞台で培った耳で、映画の音を聴く。音から映画を語る、ここにしかないレビューです。

## 完了報告前の必須検証

ページ生成・JSON編集の完了を報告する前に、必ず自分で以下を検証すること。問題があれば報告前に修正する。

1. **movies.json 構文チェック**：`node -e "JSON.parse(require('fs').readFileSync('movies.json','utf8'))"` でエラーなしを確認
2. **生成ページのリンク切れ確認**：site-auditスキルまたは内部リンクのgrep確認。存在しないslugへのリンクがないか確認
3. **短縮フィールド名の不変確認**：`n/t/d/s/y/yt/english_title/slug` がリネームされていないか確認。新情報は必ず**新フィールドとして追加**し、既存フィールドを改名・削除しない

## 注意点

- register.html はリモートを直接書き換える→作業前に git pull 必須
- Claude Code起動時に C:\Users\USER で開く事故が頻発→フォルダ確認
- パソコンが重くなりやすい→大量出力せずファイル書き出し、auto mode活用
