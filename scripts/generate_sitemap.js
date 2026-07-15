'use strict';
// 586本のsitemap.xml生成
// slug付き非お手本 → /movies/[slug]/
// お手本6本 → /movies/[n]/
const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const BASE   = 'https://ouchi-de-cinema.com';
const SKIP_N = new Set([303, 101, 2176, 2719, 1239, 1100]);
const TODAY  = new Date().toISOString().slice(0, 10);

const publishList = JSON.parse(fs.readFileSync(path.join(ROOT, 'publish_list.json'), 'utf8'));
const movies      = JSON.parse(fs.readFileSync(path.join(ROOT, 'movies.json'), 'utf8'));
const plSet       = new Set(publishList.map(e => `${e.n}_${e.t}`));

function reviewLen(d) {
  if (!d) return 0;
  return d.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, '').length;
}

// A判定(200字以上)のみsitemapに含める
const withSlug = movies.filter(m => m.slug && plSet.has(`${m.n}_${m.t}`) && reviewLen(m.d) >= 200);

const urls = [];

// トップページ
urls.push({ loc: `${BASE}/`, priority: '1.0', changefreq: 'weekly' });
urls.push({ loc: `${BASE}/list.html`, priority: '0.8', changefreq: 'weekly' });

// 映画ページ
for (const m of withSlug) {
  const loc = SKIP_N.has(m.n)
    ? `${BASE}/movies/${m.n}/`
    : `${BASE}/movies/${m.slug}/`;
  urls.push({ loc, priority: '0.7', changefreq: 'monthly' });
}

// ジャンルハブページ（genres/*/index.html が存在するものを自動収集）
const genresDir = path.join(ROOT, 'genres');
if (fs.existsSync(genresDir)) {
  for (const slug of fs.readdirSync(genresDir)) {
    const htmlPath = path.join(genresDir, slug, 'index.html');
    if (fs.existsSync(htmlPath)) {
      urls.push({ loc: `${BASE}/genres/${slug}/`, priority: '0.6', changefreq: 'weekly' });
    }
  }
}

const hubCount = urls.length - withSlug.length - 2;

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
console.log(`sitemap.xml 生成完了: ${urls.length} URL（映画ページ ${withSlug.length} 本 + ジャンルハブ ${hubCount}件 + トップ等 2件）`);
