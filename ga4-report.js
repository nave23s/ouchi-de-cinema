const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CREDENTIALS_PATH = path.join(__dirname, 'credentials', 'client_secret.json');
const TOKEN_PATH = path.join(__dirname, 'credentials', 'ga4-token.json');
const GA4_PROPERTY_ID = '542901827';

async function getAuthClient() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_id, client_secret, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
    return oAuth2Client;
  }

  // 初回のみ：ブラウザで認証してコードを取得
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/analytics.readonly'],
  });

  console.log('\n【初回認証】以下のURLをブラウザで開いてください:\n');
  console.log(authUrl);
  console.log('\nログイン・許可後に表示されるコードをここに貼り付けてください。');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = await new Promise(resolve => rl.question('\n認証コード: ', resolve));
  rl.close();

  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  console.log('認証情報を保存しました（次回から不要）\n');

  return oAuth2Client;
}

function getLastWeekRange() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=日, 1=月...
  const lastMonday = new Date(today);
  lastMonday.setDate(today.getDate() - dayOfWeek - 6);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  const fmt = d => d.toISOString().split('T')[0];
  return { start: fmt(lastMonday), end: fmt(lastSunday) };
}

async function getTop20Pages() {
  const auth = await getAuthClient();
  const analyticsData = google.analyticsdata({ version: 'v1beta', auth });
  const { start, end } = getLastWeekRange();

  const response = await analyticsData.properties.runReport({
    property: `properties/${GA4_PROPERTY_ID}`,
    requestBody: {
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions: [{ name: 'pageTitle' }, { name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 20,
    },
  });

  console.log(`\n先週のページ別アクセス上位20（${start} 〜 ${end}）\n`);
  console.log('順位  PV数   ページタイトル');
  console.log('─'.repeat(70));

  response.data.rows?.forEach((row, i) => {
    const title = row.dimensionValues[0].value;
    const pv = row.metricValues[0].value;
    console.log(`${String(i + 1).padStart(2)}位  ${String(pv).padStart(5)}PV  ${title}`);
  });

  console.log('\n');
}

getTop20Pages().catch(err => {
  console.error('エラー:', err.message);
  process.exit(1);
});
