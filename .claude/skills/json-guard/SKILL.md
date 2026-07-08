---
name: json-guard
description: movies.jsonのバックアップと整合性チェック。「バックアップして」「movies.jsonを検証して」「整合性チェック」「json-guard」と言われたら必ずこのスキルを使う。movies.json本体には一切書き込まない。
allowed-tools:
  - Bash
  - Read
  - Write
---

# json-guard スキル

**movies.json本体への書き込みは絶対禁止。読み取りとコピーのみ。既存フィールド名の変更禁止。**

## movies.json の実構造（確認済み・2026-07-09時点）

- 総件数: 2489件（array of objects）
- 必須フィールド: `n`（number型、一意のID）、`t`（string型、タイトル）
- 全フィールド: `n`, `t`, `d`, `s`, `y`, `yt`, `english_title`, `slug`, `series`, `episode`, `director`, `genre`, `music`, `backfill_note`
- `n` は常に number 型

---

## 機能1: バックアップ

`backups/` フォルダに日付付きファイル名でコピーする。

```bash
node -e "
const fs = require('fs');
const path = require('path');

const today = new Date().toISOString().slice(0, 10);
const backupDir = 'backups';
const dest = path.join(backupDir, \`movies_\${today}.json\`);

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
  console.log('backups/ フォルダを作成しました');
}

if (fs.existsSync(dest)) {
  console.log(\`既に本日のバックアップが存在します: \${dest}\`);
} else {
  fs.copyFileSync('movies.json', dest);
  const size = (fs.statSync(dest).size / 1024).toFixed(1);
  console.log(\`バックアップ完了: \${dest} (\${size} KB)\`);
}
"
```

---

## 機能2: 整合性チェック

以下の3項目を検査し、結果を日本語で報告する。

```bash
node -e "
const fs = require('fs');
let raw, data;

// 1. JSONとして読めるか
try {
  raw = fs.readFileSync('movies.json', 'utf8');
  data = JSON.parse(raw);
  console.log('✅ JSON形式: 正常に読み込めました（' + data.length + '件）');
} catch (e) {
  console.log('❌ JSON形式エラー:', e.message);
  process.exit(1);
}

// 2. n の重複チェック
const nMap = {};
const duplicates = [];
data.forEach(m => {
  if (nMap[m.n]) {
    duplicates.push(m.n);
  }
  nMap[m.n] = (nMap[m.n] || 0) + 1;
});
if (duplicates.length === 0) {
  console.log('✅ n重複: なし');
} else {
  const dupes = [...new Set(duplicates)];
  console.log('❌ n重複あり (' + dupes.length + '件): ' + dupes.join(', '));
}

// 3. 必須フィールド(n/t)の欠落チェック
const missingN = data.filter(m => m.n === undefined || m.n === null);
const missingT = data.filter(m => !m.t);
if (missingN.length === 0) {
  console.log('✅ フィールドn: 全件に存在');
} else {
  console.log('❌ フィールドn 欠落: ' + missingN.length + '件');
}
if (missingT.length === 0) {
  console.log('✅ フィールドt: 全件に存在');
} else {
  const samples = missingT.slice(0, 5).map(m => 'n=' + m.n);
  console.log('❌ フィールドt 欠落: ' + missingT.length + '件 (例: ' + samples.join(', ') + ')');
}

// 4. サマリー
console.log('');
console.log('--- サマリー ---');
console.log('総件数: ' + data.length + '件');
console.log('slug付き(公開済み): ' + data.filter(m => m.slug).length + '件');
console.log('episode付き(TVシリーズ): ' + data.filter(m => m.episode).length + '件');
console.log('director埋め済み: ' + data.filter(m => m.director).length + '件');
console.log('genre埋め済み: ' + data.filter(m => m.genre).length + '件');
console.log('music埋め済み: ' + data.filter(m => m.music).length + '件');
"
```

---

## 使い方

「バックアップして」→ 機能1のコマンドを実行  
「整合性チェックして」→ 機能2のコマンドを実行  
「json-guardを実行して」→ 機能2（チェック）→ 機能1（バックアップ）の順で両方実行  

## 注意事項

- `backups/` フォルダは `.gitignore` に追加推奨（大きなファイルが増えるため）
- 同日に複数回バックアップしても上書きしない（既存を保護）
- エラーが出た場合はmovies.jsonを直接編集せず、ユーザーに報告して判断を仰ぐ
