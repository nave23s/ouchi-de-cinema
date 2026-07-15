'use strict';
const fs   = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function reviewLen(d) {
  if (!d) return 0;
  return d.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, '').length;
}

const movies = JSON.parse(fs.readFileSync(path.join(ROOT, 'movies.json'), 'utf8'));

// A判定かつvod_services未設定のページ = VOD個別アフィリエイト未設定
const todo = movies
  .filter(m => m.slug && reviewLen(m.d) >= 200 && (!m.vod_services || m.vod_services.length === 0))
  .map(m => ({ n: m.n, slug: m.slug, title: m.t }));

const out = path.join(ROOT, 'data', 'monetization-todo.json');
if (!fs.existsSync(path.join(ROOT, 'data'))) fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
fs.writeFileSync(out, JSON.stringify(todo, null, 2), 'utf8');
console.log('monetization-todo.json 保存:', todo.length, '件');
