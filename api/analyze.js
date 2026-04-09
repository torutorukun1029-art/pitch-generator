const SYSTEM_PROMPT = `あなたは採用ピッチ資料の専門家です。提供された求人原稿・HP情報からデータを抽出してください。

【最重要ルール】
■ 数字・固有名詞（給与・勤務時間・休日・住所・社名・従業員数・売上など）は原稿に書いてある数字・言葉だけを使う。書いていなければ必ず空文字にする。絶対に推測・補完・でっち上げをしない。
■ 文章・方向性・説明文（ミッション・カルチャー・事業説明など）は提供された原稿・HP情報の内容をもとにAIが自然にまとめてよい。ただし提供された情報にない内容は書かない。
■ JSON形式のみで回答。前置き・説明不要。

【給与の判定ルール（厳守）】
・月給・月収の場合：salaryUnit="月給"、salaryMin/salaryMax=万円単位の数字
・年俸・年収の場合：salaryUnit="年俸"、salaryMin/salaryMax=万円単位の数字
・時給の場合：salaryUnit="時給"、salaryMin/salaryMax=円単位の数字
・日給の場合：salaryUnit="日給"、salaryMin/salaryMax=円単位の数字
・時給・日給の場合、絶対に万円換算しないこと。

{
  "companyName": "会社名（原稿から）",
  "ceo": "代表者名（原稿・HPから。なければ空文字）",
  "address": "住所（原稿・HPから。なければ空文字）",
  "founded": "設立年月（原稿・HPから。なければ空文字）",
  "employees": "従業員数（原稿・HP本文に具体的な人数が書いてある場合のみ。Indeedのレンジ表示は使用しない。なければ空文字）",
  "sales": "売上高（原稿・HPから。なければ空文字）",
  "business": "事業内容一行（原稿・HPから）",
  "mission": "ミッション・企業の想い（原稿・HPの言葉をもとに2行で）",
  "missionEn": "英語サブタイトル（原稿・HPにあれば。なければ空文字）",
  "missionDesc": "企業説明（原稿・HPの会社説明をもとに200文字。提供された情報にない内容は書かない）",
  "bizHeadline": "事業コピー（原稿・HPの事業内容から）",
  "services": [{"title":"サービス名（原稿・HPから）","desc":"説明（原稿・HPから）"},{"title":"","desc":""},{"title":"","desc":""},{"title":"","desc":""}],
  "biz1Title": "メイン事業名（原稿・HPから）",
  "biz1Body": "メイン事業説明（原稿・HPをもとに200文字）",
  "biz2Title": "サブ事業名（原稿・HPから。なければ空文字）",
  "biz2Body": "サブ事業説明（原稿・HPをもとに。なければ空文字）",
  "cultureVal1": "カルチャー価値観1（原稿・HPから読み取れるもの）",
  "cultureVal2": "カルチャー価値観2（原稿・HPから読み取れるもの）",
  "cultureDesc": "カルチャー説明（原稿・HPの職場環境をもとに300文字）",
  "wantedList": ["求める人物像（原稿の求める人材から・簡潔に20文字以内で）","","","",""],
  "interview": {
    "person": "インタビュー対象者（原稿・HPに記載あれば。なければ空文字）",
    "q1": "質問1（原稿・HPから）",
    "a1": "回答1（原稿・HPから。提供された情報にない内容は書かない）",
    "q2": "質問2（原稿・HPから）",
    "a2": "回答2（原稿・HPから）",
    "q3": "質問3（原稿・HPから）",
    "a3": "回答3（原稿・HPから）"
  },
  "salaryMin": "給与下限（月給・年俸なら万円の数字のみ。時給・日給なら円の数字のみ。なければ空文字）",
  "salaryMax": "給与上限（月給・年俸なら万円の数字のみ。時給・日給なら円の数字のみ。なければ空文字）",
  "salaryUnit": "月給 or 年俸 or 時給 or 日給（原稿から正確に判定）",
  "salaryNote": "給与備考（原稿から。固定残業・賞与など）",
  "salaryFactors": [
    {"name":"要素名（原稿から）","desc":"説明（原稿から）"},
    {"name":"","desc":""},
    {"name":"","desc":""}
  ],
  "careerPath": [
    {"title":"ポジション名（原稿から）","period":"期間（原稿から）","salary":"年収目安（原稿の数字のみ）","desc":"説明（原稿から・簡潔に）"},
    {"title":"","period":"","salary":"","desc":""},
    {"title":"","period":"","salary":"","desc":""},
    {"title":"","period":"","salary":"","desc":""}
  ],
  "salaryExamples": [
    {"label":"例（原稿に記載の年収例）","amount":"金額（数字のみ・万円）"},
    {"label":"","amount":""},
    {"label":"","amount":""}
  ],
  "workHours": "就業時間（原稿から。なければ空文字）",
  "workLocation": "勤務地・アクセス（原稿・HPから。なければ空文字）",
  "holidays": ["休日（原稿から）","",""],
  "benefits": ["福利厚生（原稿から）","","","","",""]
}`;

function extractTextFromHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000);
}

async function fetchPageText(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PitchGenerator/1.0)' },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return '';
    return extractTextFromHtml(await res.text());
  } catch (e) {
    return '';
  }
}

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, password, indeedUrl, hpUrl } = req.body;

  if (password !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: 'パスワードが違います' });
  }

  if ((!text || text.trim().length < 10) && !indeedUrl && !hpUrl) {
    return res.status(400).json({ error: '求人原稿またはURLを入力してください' });
  }

  try {
    // URLからテキスト取得（並行処理）
    let indeedText = '';
    let hpText = '';
    await Promise.allSettled([
      indeedUrl && indeedUrl.startsWith('http') ? fetchPageText(indeedUrl).then(t => { indeedText = t; }) : Promise.resolve(),
      hpUrl && hpUrl.startsWith('http') ? fetchPageText(hpUrl).then(t => { hpText = t; }) : Promise.resolve()
    ]);

    // 全情報を結合
    let combinedText = '';
    if (text && text.trim().length > 10) combinedText += `【求人原稿】\n${text.trim()}\n\n`;
    if (indeedText) combinedText += `【Indeed求人ページ情報】\n${indeedText}\n\n`;
    if (hpText) combinedText += `【企業HPテキスト情報】\n${hpText}\n\n`;

    if (!combinedText.trim()) {
      return res.status(400).json({ error: '情報を取得できませんでした' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: combinedText }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const txt = (data.content?.[0]?.text || '').replace(/```json\n?|```\n?/g, '').trim();
    const parsed = JSON.parse(txt);
    return res.status(200).json({ result: parsed });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
