'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT        = path.resolve(__dirname, '..');
const AFFILIATE_ID = 'ouchidecinama-22';
const GA4_ID       = 'G-NQYTVV8D13';
const SITE_URL     = 'https://ouchi-de-cinema.com';
const OGP_IMAGE    = `${SITE_URL}/ogp.jpg`;

const GENRE_SLUG = {
  'アクション':   'action',
  'SF':           'sf',
  'ドラマ':       'drama',
  'コメディ':     'comedy',
  'ホラー':       'horror',
  'スリラー':     'thriller',
  'サスペンス':   'suspense',
  'ミステリー':   'mystery',
  'ロマンス':     'romance',
  'アニメ':       'anime',
  'ファンタジー': 'fantasy',
  'アドベンチャー': 'adventure',
  '戦争':           'war',
  'クライム':       'crime',
  '音楽・ミュージカル': 'musical',
  'ドキュメンタリー': 'documentary',
  '時代劇・歴史': 'historical',
  'ファミリー':   'family',
  'スポーツ':     'sports',
  '伝記・実話':   'biographical',
};

const GENRE_DESC = {
  'ドラマ':   '人間の感情と音楽が交差するドラマ映画を、音・音楽の視点でレビューしています。セリフより雄弁に語る劇伴と、沈黙の使い方に注目しながら選りすぐりの作品を紹介します。',
  'アクション':'スピード感あふれるアクション映画の音楽を、打楽器・効果音・スコアの三位一体で語ります。映像だけでなく「音で感じるアクション」に着目したレビューを揃えています。',
  'ロマンス':  '恋愛映画の核心にある音楽を深掘りします。セリフに乗せられた感情ではなく、ピアノの旋律や主題歌が二人の距離を縮める瞬間に焦点を当てたレビューです。',
  'コメディ':  '笑いとリズムは切り離せません。コメディ映画の音楽・効果音・テンポが笑いをどう引き立てているかを、実際に観た感想とともに語ります。',
  'SF':        '宇宙・未来・AIを題材にしたSF映画では、音楽そのものが世界観の一部です。電子音からオーケストラまで、SF映画の音響設計を音楽視点で読み解きます。',
  'アドベンチャー': '壮大な冒険を彩る映画音楽は、それ自体が旅です。アドベンチャー映画の劇伴が冒険心をどう刺激するか、実際の視聴体験とともにレビューしています。',
  'クライム': 'クライム映画の音楽は、緊張と解放のコントロールが命です。静寂と轟音の使い分けが観客の息を止める。クライム映画の劇伴に潜む心理的駆け引きを音の視点で語ります。',
  'サスペンス': 'サスペンス映画の音楽は「知らせすぎない」ことが武器。低音の持続音、弦の不協和音が恐怖を予告する。音が先行して感情を操作するサスペンス映画の劇伴を徹底解剖します。',
};

const GENRE_FAQ = {
  'ドラマ':   [
    { q: 'ドラマ映画で音楽が重要な理由は？', a: 'ドラマ映画では感情の機微を音で補完する。言葉にならない想いを劇伴が代弁し、沈黙の使い方が物語の深みを左右します。' },
    { q: 'このサイトのドラマ映画レビューの特徴は？', a: '音・劇伴・主題歌の3つの視点から映画を語ります。あらすじ紹介より「音でどう感じたか」を重視した主観レビューです。' },
  ],
  'アクション': [
    { q: 'アクション映画と音楽の関係は？', a: '打楽器のリズムが緊張を高め、無音が最大の恐怖を生む。アクション映画の音楽は映像と同等の武器です。' },
    { q: 'このサイトのアクション映画レビューの特徴は？', a: '効果音・劇伴・主題歌を分析し、映像だけでなく「耳で体験するアクション」を伝えます。' },
  ],
  'ロマンス': [
    { q: 'ロマンス映画の音楽の特徴は？', a: 'ロマンス映画では主題歌が感情のアンカーになります。特定の曲が流れた瞬間に感情が動く設計が秀逸な作品を紹介します。' },
    { q: 'このサイトのロマンス映画レビューの特徴は？', a: '恋愛の高揚と切なさを音楽がどう演出するかに着目。劇場では聴こえていた「あの音」を言語化します。' },
  ],
  'コメディ': [
    { q: 'コメディ映画と音楽はどう関係する？', a: '笑いにはリズムがある。効果音・BGMのテンポがギャグのタイミングを決定的にします。音のないコメディは半減します。' },
    { q: 'このサイトのコメディ映画レビューの特徴は？', a: '笑いを生む音の仕掛けを分析しつつ、実際に観た感想も率直に語ります。' },
  ],
  'SF': [
    { q: 'SF映画の音楽の特徴は？', a: 'SF映画の音楽は世界観そのもの。電子音・シンセが未来を、オーケストラが人間性を表現します。音響設計が映画の質を左右します。' },
    { q: 'このサイトのSF映画レビューの特徴は？', a: 'SFの音楽・音響設計を中心に、世界観への没入感を音の視点で語ります。' },
  ],
  'アドベンチャー': [
    { q: 'アドベンチャー映画の音楽の役割は？', a: 'アドベンチャー映画の劇伴は地図のようなもの。どこへ向かうか、何が待ち受けているかを音が先に教えてくれます。' },
    { q: 'このサイトのアドベンチャー映画レビューの特徴は？', a: '冒険の高揚感を生む音楽の仕掛けを解説しつつ、観た後に残る余韻まで語ります。' },
  ],
  'クライム': [
    { q: 'クライム映画の音楽の特徴は？', a: 'クライム映画の劇伴は静寂と轟音の使い分けが命。緊張感を高める低音と、解放感をもたらす主題歌の対比が映画の質を決めます。' },
    { q: 'このサイトのクライム映画レビューの特徴は？', a: '音がクライムをどう演出するかに着目。劇伴・効果音・沈黙の使い方からクライム映画の本質を語ります。' },
  ],
  'サスペンス': [
    { q: 'サスペンス映画の音楽の特徴は？', a: 'サスペンスの音楽は「予感」を売りにする。弦の不協和音や低音の持続が恐怖を先取りし、観客の心拍数を操作します。' },
    { q: 'このサイトのサスペンス映画レビューの特徴は？', a: '音が恐怖をどう仕掛けるかを具体的に語ります。セリフではなく劇伴が語るサスペンスの本質に迫ります。' },
  ],
};

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildGenrePage(genre, works) {
  const slug    = GENRE_SLUG[genre];
  const pageUrl = `${SITE_URL}/genres/${slug}/`;
  const title   = `${genre}映画 レビュー一覧【オウチ de CINEMA】`;
  const desc    = `${genre}映画を音楽・音の視点でレビュー。${works.length}本掲載中（順次追加中）。サントラ・劇伴情報も。`;
  const intro   = GENRE_DESC[genre] || `${genre}ジャンルの映画を音楽・音の視点でレビューしています。`;
  const faqs    = GENRE_FAQ[genre] || [];

  const workList = works.map(w => `
    <a href="${SITE_URL}/movies/${esc(w.slug)}/" class="hub-card">
      <div class="hub-card-title">${esc(w.t)}</div>
      <div class="hub-card-meta">${w.year ? w.year + '年' : ''}</div>
    </a>`).join('\n');

  const faqItems = faqs.map(f => `
    <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
      <div class="faq-q" itemprop="name">${esc(f.q)}</div>
      <div class="faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
        <span itemprop="text">${esc(f.a)}</span>
      </div>
    </div>`).join('\n');

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description: desc,
    url: pageUrl,
    numberOfItems: works.length,
  });

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA4_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${GA4_ID}');
</script>
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${pageUrl}">
<meta property="og:type"        content="website">
<meta property="og:url"         content="${pageUrl}">
<meta property="og:title"       content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image"       content="${OGP_IMAGE}">
<meta property="og:site_name"   content="オウチ de CINEMA">
<meta name="twitter:card"       content="summary_large_image">
<meta name="twitter:title"      content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image"      content="${OGP_IMAGE}">
<script type="application/ld+json">${jsonLd}</script>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<header class="site-header">
  <a href="/" class="site-logo">オウチ de CINEMA</a>
  <nav class="global-nav">
    <a href="/list.html">映画リスト</a>
    <a href="/about.html">このサイトについて</a>
  </nav>
</header>

<main class="main-content">
  <div class="hub-hero">
    <p class="hub-label">ジャンル</p>
    <h1 class="hub-title">${esc(genre)}</h1>
    <p class="hub-count">${works.length}本掲載中 ※作品は順次追加中</p>
  </div>

  <section class="section">
    <div class="sec-label">このページについて</div>
    <p class="hub-intro">${esc(intro)}</p>
  </section>

  <section class="section">
    <div class="sec-label sec-label-gold">レビュー一覧</div>
    <div class="hub-card-list">
${workList}
    </div>
  </section>

${faqs.length > 0 ? `  <section class="section" itemscope itemtype="https://schema.org/FAQPage">
    <div class="sec-label">よくある質問</div>
    ${faqItems}
  </section>` : ''}

  <section class="section author-section">
    <div class="sec-label">レビュアーについて</div>
    <p>舞台経験で培った耳で、映画の音を聴く。<a href="/about.html">書き手プロフィール →</a></p>
  </section>
</main>

<footer class="site-footer">
  <p><a href="/">オウチ de CINEMA</a> — 音で映画を語る作品レビューサイト</p>
</footer>
</body>
</html>`;
}

function main() {
  const movies  = JSON.parse(fs.readFileSync(path.join(ROOT, 'movies.json'), 'utf8'));
  const isDry   = process.argv.includes('--dry-run');
  const MIN_WORKS = 3;
  const TARGETS = ['ドラマ','アクション','ロマンス','コメディ','SF','アドベンチャー','クライム','サスペンス','音楽・ミュージカル'];

  let generated = 0, skipped = 0;
  const report = [];

  for (const genre of TARGETS) {
    const slug  = GENRE_SLUG[genre];
    const works = movies.filter(m => m.slug && m.genre && m.genre.includes(genre))
                        .sort((a, b) => (a.year || 0) - (b.year || 0));

    if (works.length < MIN_WORKS) {
      console.log(`SKIP ${genre}: ${works.length}本（3本未満）`);
      skipped++;
      continue;
    }

    const outDir  = path.join(ROOT, 'genres', slug);
    const outFile = path.join(outDir, 'index.html');

    if (isDry) {
      console.log(`[新規] /genres/${slug}/ (${works.length}本)`);
      report.push(`/genres/${slug}/`);
      continue;
    }

    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outFile, buildGenrePage(genre, works), 'utf8');
    console.log(`生成: /genres/${slug}/ (${works.length}本)`);
    report.push(`/genres/${slug}/`);
    generated++;
  }

  if (!isDry) {
    console.log(`\n完了: 生成 ${generated}件 / スキップ ${skipped}件`);
    console.log('生成したページ:', report);
  }
}

main();
