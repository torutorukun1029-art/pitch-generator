const SYSTEM_PROMPT = `あなたは採用ピッチ資料の専門家です。提供された求人原稿・ホームページ情報からデータを抽出してください。

【最重要ルール】
■ 数字・固有名詞（給与・勤務時間・休日・住所・社名・従業員数・売上など）は原稿に書いてある数字・言葉だけを使う。書いていなければ必ず空文字にする。絶対に推測・補完・でっち上げをしない。
■ 文章・方向性・説明文（ミッション・カルチャー・事業説明など）は原稿の内容をもとにAIが自然にまとめてよい。
■ JSON形式のみで回答。前置き・説明不要。

{
  "companyName": "会社名（原稿から）",
  "ceo": "代表者名（原稿から。なければ空文字）",
  "address": "住所（原稿から。なければ空文字）",
  "founded": "設立年月（原稿から。なければ空文字）",
  "employees": "従業員数（原稿から。なければ空文字）",
  "sales": "売上高（原稿から。なければ空文字）",
  "business": "事業内容一行（原稿から）",
  "mission": "ミッション・企業の想い（原稿の言葉をもとに2行で）",
  "missionEn": "英語サブタイトル（原稿にあれば。なければ空文字）",
  "missionDesc": "企業説明（原稿の会社説明をもとに200文字。原稿にない内容は書かない）",
  "bizHeadline": "事業コピー（原稿の事業内容から）",
  "services": [{"title":"サービス名（原稿から）","desc":"説明（原稿から）"},{"title":"","desc":""},{"title":"","desc":""},{"title":"","desc":""}],
  "biz1Title": "メイン事業名（原稿から）",
  "biz1Body": "メイン事業説明（原稿をもとに200文字）",
  "biz2Title": "サブ事業名（原稿から。なければ空文字）",
  "biz2Body": "サブ事業説明（原稿をもとに。なければ空文字）",
  "cultureVal1": "カルチャー価値観1（原稿から読み取れるもの）",
  "cultureVal2": "カルチャー価値観2（原稿から読み取れるもの）",
  "cultureDesc": "カルチャー説明（原稿の職場環境・インタビューをもとに300文字）",
  "wantedList": ["求める人物像（原稿の求める人材から）","","","",""],
  "interview": {
    "person": "インタビュー対象者（原稿に記載あれば。なければ空文字）",
    "q1": "質問1（原稿から）",
    "a1": "回答1（原稿から。原稿にない内容は書かない）",
    "q2": "質問2（原稿から）",
    "a2": "回答2（原稿から）",
    "q3": "質問3（原稿から）",
    "a3": "回答3（原稿から）"
  },
  "salaryMin": "【数字のみ・万円】最低給与（原稿の数字をそのまま。なければ空文字）",
  "salaryMax": "【数字のみ・万円】最高給与（原稿の数字をそのまま。なければ空文字）",
  "salaryUnit": "月給 or 年俸（原稿から）",
  "salaryNote": "給与備考（原稿から。固定残業・賞与など）",
  "salaryFactors": [
    {"name":"要素名（原稿から）","desc":"説明（原稿から）"},
    {"name":"","desc":""},
    {"name":"","desc":""}
  ],
  "careerPath": [
    {"title":"ポジション名（原稿から）","period":"期間（原稿から）","salary":"年収目安（原稿の数字のみ）","desc":"説明（原稿から）"},
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
  "workLocation": "勤務地・アクセス（原稿から。なければ空文字）",
  "holidays": ["休日（原稿から）","",""],
  "benefits": ["福利厚生（原稿から）","","","","",""]
}`;

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, password } = req.body;

  if (password !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: 'パスワードが違います' });
  }

  if (!text || text.trim().length < 50) {
    return res.status(400).json({ error: '求人原稿が短すぎます' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: text }]
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
