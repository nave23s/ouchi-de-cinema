const fs = require('fs');
const path = require('path');

const KEYWORDS = [
  'ミュージカル', '歌声', '歌う', '歌手', '歌が', '歌の', '歌を', '歌で', '歌は',
  'バンド', 'ジャズ', 'ロック', '楽器', '演奏', '作曲', '作詞',
  'サウンドトラック', 'サントラ',
  'ライブ', 'コンサート', 'オーケストラ',
  'ピアノ', 'ギター', 'ドラム', 'ベース', 'バイオリン', 'チェロ', 'トランペット', 'サックス',
  'ボーカル', 'ラップ', 'ヒップホップ', 'オペラ', '合唱',
  '指揮', 'ミュージシャン', 'シンガー', 'レコード',
  '音楽映画', '音楽劇', 'ミュージック',
  'アカペラ', 'ブルース', 'ソウル', 'クラシック音楽',
  'ストリートミュージシャン', 'ビッグバンド', 'アイドル',
];

const moviesPath = path.join(__dirname, 'movies.json');
const movies = JSON.parse(fs.readFileSync(moviesPath, 'utf8'));

const results = [];

for (const movie of movies) {
  if (movie.h) continue; // 非公開スキップ

  const text = (movie.t || '') + ' ' + (movie.d || '');
  const matched = KEYWORDS.filter(kw => text.includes(kw));

  if (matched.length > 0) {
    results.push({
      n: movie.n,
      t: movie.t,
      y: movie.y || null,
      matched_keywords: matched,
      match_count: matched.length,
    });
  }
}

// マッチ数の多い順にソート
results.sort((a, b) => b.match_count - a.match_count);

const outputPath = path.join(__dirname, 'music_movies.json');
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');

console.log(`検索対象: ${movies.filter(m => !m.h).length} 本`);
console.log(`ヒット数: ${results.length} 本`);
console.log('');
console.log('=== マッチ数TOP30 ===');
results.slice(0, 30).forEach((m, i) => {
  console.log(`${String(i + 1).padStart(2)}. No.${m.n} 「${m.t}」 (${m.match_count}ワード: ${m.matched_keywords.join(', ')})`);
});
console.log('');
console.log(`→ music_movies.json に出力しました（${results.length}本）`);
